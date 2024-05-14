var assert = require('assert')
const KB = 1024
const MB = KB * 1024
const CACHE_SZ = 32 * KB
const CHUNK_SZ = 128 * MB
const NOTIFY_SZ = 512 * MB

module.exports = function weaveDrive(mod, FS) {
  return {
    reset(fd) {
      //console.log("WeaveDrive: Resetting fd: ", fd)
      FS.streams[fd].node.position = 0
      FS.streams[fd].node.cache = new Uint8Array(0)
    },

    async create(id) {
      var properties = { isDevice: false, contents: null }

      if (!await this.checkAdmissible(id)) {
        console.log("WeaveDrive: Arweave ID is not admissable! ", id)
        return 0;
      }

      // Create the file in the emscripten FS
      // TODO: might make sense to create the `data` folder here if does not exist
      var node = FS.createFile('/', 'data/' + id, properties, true, false);
      // Set initial parameters
      var bytesLength = await fetch(`${mod.ARWEAVE}/${id}`, { method: 'HEAD' }).then(res => res.headers.get('Content-Length'))
      node.total_size = Number(bytesLength)
      node.cache = new Uint8Array(0)
      node.position = 0;

      // Add a function that defers querying the file size until it is asked the first time.
      Object.defineProperties(node, { usedBytes: { get: function () { return bytesLength; } } });

      // Now we have created the file in the emscripten FS, we can open it as a stream
      var stream = FS.open('/data/' + id, "r")

      //console.log("JS: Created file: ", id, " fd: ", stream.fd);
      return stream;
    },

    async open(filename) {
      const pathCategory = filename.split('/')[1];
      const id = filename.split('/')[2];
      console.log("JS: Opening ID: ", id);

      if (pathCategory === 'data') {
        if (FS.analyzePath(filename).exists) {
          for (var i = 0; i < FS.streams.length; i++) {
            if (FS.streams[i].node.name === id) {
              //console.log("JS: Found file: ", filename, " fd: ", FS.streams[i].fd);
              return FS.streams[i].fd;
            }
          }
          console.log("JS: File not found: ", filename);
          return 0;
        }
        else {
          //console.log("JS: Open => Creating file: ", id);
          const stream = await this.create(id);
          //console.log("JS: Open => Created file: ", id, " fd: ", stream.fd);
          return stream.fd;
        }
      }
      else if (pathCategory === 'headers') {
        console.log("Header access not implemented yet.");
        return 0;
      }
      else {
        console.log("JS: Invalid path category: ", pathCategory);
        return 0;
      }
    },

    async read(fd, raw_dst_ptr, raw_length) {
      // Note: The length and dst_ptr are 53 bit integers in JS, so this _should_ be ok into a large memspace.
      var to_read = Number(raw_length)
      var dst_ptr = Number(raw_dst_ptr)

      var stream = 0;
      for (var i = 0; i < FS.streams.length; i++) {
        if (FS.streams[i].fd === fd) {
          stream = FS.streams[i]
        }
      }

      // Satisfy what we can with the cache first
      var bytes_read = this.readFromCache(stream, dst_ptr, to_read)
      stream.position += bytes_read
      stream.lastReadPosition = stream.position;
      dst_ptr += bytes_read
      to_read -= bytes_read

      // Return if we have satisfied the request
      if (to_read === 0) {
        //console.log("WeaveDrive: Satisfied request with cache. Returning...")
        return bytes_read
      }
      //console.log("WeaveDrive: Read from cache: ", bytes_read, " Remaining to read: ", to_read)

      const chunk_download_sz = Math.max(to_read, CACHE_SZ)
      const to = Math.min(stream.node.total_size, stream.position + chunk_download_sz);
      //console.log("WeaveDrive: fd: ", fd, " Read length: ", to_read, " Reading ahead:", to - to_read - stream.position)

      // Fetch with streaming
      const response = await fetch(`${mod.ARWEAVE}/${stream.node.name}`, {
        method: "GET",
        redirect: "follow",
        headers: { "Range": `bytes=${stream.position}-${to}` }
      });

      const reader = response.body.getReader()
      var bytes_until_cache = CHUNK_SZ
      var bytes_until_notify = NOTIFY_SZ
      var downloaded_bytes = 0
      var cache_chunks = []

      try {
        while (true) {
          const { done, value: chunk_bytes } = await reader.read();
          if (done) break;
          // Update the number of downloaded bytes to be _all_, not just the write length
          downloaded_bytes += chunk_bytes.length
          bytes_until_cache -= chunk_bytes.length
          bytes_until_notify -= chunk_bytes.length

          // Write bytes from the chunk and update the pointer if necessary
          const write_length = Math.min(chunk_bytes.length, to_read);
          if (write_length > 0) {
            //console.log("WeaveDrive: Writing: ", write_length, " bytes to: ", dst_ptr)
            mod.HEAP8.set(chunk_bytes.subarray(0, write_length), dst_ptr)
            dst_ptr += write_length
            bytes_read += write_length
            stream.position += write_length
            to_read -= write_length
          }

          if (to_read == 0) {
            // Add excess bytes to our cache
            const chunk_to_cache = chunk_bytes.subarray(write_length)
            //console.log("WeaveDrive: Cacheing excess: ", chunk_to_cache.length)
            cache_chunks.push(chunk_to_cache)
          }

          if (bytes_until_cache <= 0) {
            console.log("WeaveDrive: Chunk size reached. Compressing cache...")
            stream.node.cache = this.addChunksToCache(stream.node.cache, cache_chunks)
            cache_chunks = []
            bytes_until_cache = CHUNK_SZ
          }

          if (bytes_until_notify <= 0) {
            console.log("WeaveDrive: Downloaded: ", downloaded_bytes / stream.node.total_size * 100, "%")
            bytes_until_notify = NOTIFY_SZ
          }
        }
      } catch (error) {
        console.error("WeaveDrive: Error reading the stream: ", error)
      } finally {
        reader.releaseLock()
      }
      // If we have no cache, or we have not satisfied the full request, we need to download the rest
      // Rebuild the cache from the new cache chunks
      stream.node.cache = this.addChunksToCache(stream.node.cache, cache_chunks)

      // Update the last read position
      stream.lastReadPosition = stream.position
      return bytes_read
    },

    // Readahead cache functions
    readFromCache(stream, dst_ptr, length) {
      // Check if the cache has been invalidated by a seek
      if (stream.lastReadPosition !== stream.position) {
        //console.log("WeaveDrive: Invalidating cache for fd: ", stream.fd, " Current pos: ", stream.position, " Last read pos: ", stream.lastReadPosition)
        stream.node.cache = new Uint8Array(0)
        return 0
      }
      // Calculate the bytes of the request that can be satisfied with the cache
      var cache_part_length = Math.min(length, stream.node.cache.length)
      var cache_part = stream.node.cache.subarray(0, cache_part_length)
      mod.HEAP8.set(cache_part, dst_ptr)
      // Set the new cache to the remainder of the unused cache and update pointers
      stream.node.cache = stream.node.cache.subarray(cache_part_length)

      return cache_part_length
    },

    addChunksToCache(old_cache, chunks) {
      // Make a new cache array of the old cache length + the sum of the chunk lengths, capped by the max cache size
      var new_cache_length = Math.min(old_cache.length + chunks.reduce((acc, chunk) => acc + chunk.length, 0), CACHE_SZ)
      var new_cache = new Uint8Array(new_cache_length)
      // Copy the old cache to the new cache
      new_cache.set(old_cache, 0)
      // Load the cache chunks into the new cache
      var current_offset = old_cache.length;
      for (let chunk of chunks) {
        if (current_offset < new_cache_length) {
          new_cache.set(chunk.subarray(0, new_cache_length - current_offset), current_offset);
          current_offset += chunk.length;
        }
      }
      return new_cache
    },

    // General helpder functions
    async checkAdmissible(ID) {
      if (mod.mode && mod.mode == "test") {
        // CAUTION: If the module is initiated with `mode = test` we don't check availability.
        return true
      }

      // Check that this module or process set the WeaveDrive tag on spawn
      const blockHeight = mod.blockHeight
      const moduleExtensions = this.getTagValues("Extension", mod.module.tags)
      const moduleHasWeaveDrive = moduleExtensions.includes("WeaveDrive")
      const processExtensions = this.getTagValues("Extension", mod.module.tags)
      const processHasWeaveDrive = moduleHasWeaveDrive || processExtensions.includes("WeaveDrive")

      if (!processHasWeaveDrive) {
        console.log("WeaveDrive: Process tried to call WeaveDrive, but extension not set!")
        return false
      }

      const modes = ["Assignments", "Individual", "Library"]
      // Get the Availability-Type from the spawned process's Module or Process item
      // First check the module for its defaults
      const moduleMode = mod.module.tags['Availability-Type']
        ? mod.module.tags['Availability-Type']
        : "Assignments" // Default to assignments

      // Now check the process's spawn item. These settings override Module item settings.
      const processMode = mod.spawn.tags['Availability-Type']
        ? mod.spawn.tags['Availability-Type']
        : moduleMode

      if (!modes.includes(processMode)) {
        throw `Unsupported WeaveDrive mode: ${processMode}`
      }

      var attestors = [mod.spawn.tags["Scheduler"]]
      attestors.push(this.getTagValues("Attestor", mod.spawn.tags))

      // Init a set of GraphQL queries to run in order to find a valid attestation
      // Every WeaveDrive process has at least the "Assignments" availability check form.
      const assignmentsHaveID = await this.queryHasResult(
        `query {
          transactions(
            owners:["${mod.spawn.tags["Scheduler"]}"],
            block: {min: 0, max: ${blockHeight}},
            tags: [
              { name: "Data-Protocol", values: ["ao"] },
              { name: "Type", values: ["Attestation"] },
              { name: "Message", values: ["${ID}"]}
            ]
          ) 
          {
            edges {
              node {
                tags {
                  name
                  value
                }
              }
            }
          }
        }`)

      if (assignmentsHaveID) {
        return true
      }

      if (processMode == "Individual") {
        const individualsHaveID = await this.queryHasResult(
          `query {
            transactions(
              owners:["${mod.spawn.tags["Scheduler"]}"],
              block: {min: 0, max: ${blockHeight}},
              tags: [
                { name: "Data-Protocol", values: ["WeaveDrive"],
                { name: "Type", values: ["Available"]},
                { name: "ID", values: ["${ID}"]}
              ]
            ) 
            {
              edges {
                node {
                  tags {
                    name
                    value
                  }
                }
              }
            }
          }`)

        if (individualsHaveID) {
          return true
        }
      }

      // Halt message processing if the process requires Library mode.
      // This should signal 'Cannot Process' to the CU, not that the message itself is
      // invalid. Subsequently, the CU should not be slashable for saying that the process
      // execution failed on this message. The CU must also not continue to execute further
      // messages on this process. Attesting to them would be slashable, as the state would
      // be incorrect.
      if (processMode == "Library") {
        throw "This WeaveDrive implementation does not support Library attestations yet!"
      }

      return false
    },

    getTagValues(key, tags) {
      var values = []
      for (i = 0; i < tags.length; i++) {
        if (tags[i].key == key) {
          values.push(tags[i].value)
        }
      }
      return values
    },

    async queryHasResult(query) {
      const results = await mod.arweave.api.post('/graphql', query);
      const json = JSON.parse(results)
      return json.data.transactions.edges.length > 0
    }
  }
}