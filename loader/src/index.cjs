const Emscripten = require('./formats/emscripten.cjs')
const Emscripten2 = require('./formats/emscripten2.cjs')
const Emscripten3 = require('./formats/emscripten3.cjs')
const Wasm64 = require('./formats/wasm64-emscripten.cjs')

/* eslint-enable */

/**
 * @typedef Tag
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef Message
 * @property {string} [Signature]
 * @property {string} Owner
 * @property {string} Target
 * @property {string} [Anchor]
 * @property {Tag[]} Tags
 * @property {DataItem} [Data]
 * @property {string} From
 * @property {string} [Forwarded-By]
 * @property {string} [Epoch]
 * @property {string} [Nonce]
 * @property {string} Block-Height
 * @property {string} Timestamp
 * @property {string} [Hash-Chain]
 * @property {boolean} Cron
 */

/**
 * @namespace AssignmentTypes
 */

/**
 * @typedef {string} AssignmentTypes.Message
 */

/**
 * @typedef {string[]} AssignmentTypes.Processes
 */

/**
 * @typedef {Object} AssignmentTypes.Assignment
 * @property {AssignmentTypes.Processes} Processes
 * @property {AssignmentTypes.Message} Message
 */

/**
 * @typedef Environment
 * @property {{id: string, owner: string, tags: Tag[]}} process
 */

/**
 * @typedef HandleResponse
 * @property {ArrayBuffer} Memory
 * @property {DataItem} Output
 * @property {Message[]} Messages
 * @property {Message[]} Spawns
 * @property {AssignmentTypes.Assignment[]} Assignments
 */

/**
 * @callback handleFunction
 * @param {ArrayBuffer | NULL} buffer
 * @param {Message} msg
 * @param {Environment} env
 * @returns {HandleResponse}
 */

/**
 * @typedef Options
 * @property {string} format
 * @property {string} input
 * @property {string} output
 * @property {string} memory
 * @property {string} compute
 * @property {String[]} extensions
 */

/**
 * @param {ArrayBuffer} binary
 * @param {Options} options
 * @returns {Promise<handleFunction>}
 */
module.exports = async function (binary, options) {
  let instance = null
  let doHandle = null
  if (options === null) {
    options = { format: 'wasm32-unknown-emscripten' }
  }
  if (options.format === "wasm32-unknown-emscripten") {
    instance = await Emscripten(binary, options)
  } else if (options.format === "wasm32-unknown-emscripten2") {
    instance = await Emscripten2(binary, options)
  } else if (options.format === "wasm32-unknown-emscripten3") {
    instance = await Emscripten3(binary, options)
  } else if (options.format === "wasm64-unknown-emscripten-draft_2024_02_15") {
    // instance = await Wasm64Emscripten(binary, options)
    if (typeof binary === "function") {
      options.instantiateWasm = binary;
    } else {
      options.wasmBinary = binary;
    }
    options.AdmissableList = [
      "dx3GrOQPV5Mwc1c-4HTsyq0s1TNugMf7XfIKJkyVQt8", // Random NFT metadata (1.7kb of JSON)
      "XOJ8FBxa6sGLwChnxhF2L71WkKLSKq1aU5Yn5WnFLrY", // GPT-2 117M model.
      "M-OzkyjxWhSvWYF87p0kvmkuAEEkvOzIj4nMNoSIydc", // GPT-2-XL 4-bit quantized model.
      "kd34P4974oqZf2Db-hFTUiCipsU6CzbR6t-iJoQhKIo", // Phi-2 
      "ISrbGzQot05rs_HKC08O_SmkipYQnqgB1yC3mjZZeEo", // Phi-3 Mini 4k Instruct
      "sKqjvBbhqKvgzZT4ojP1FNvt4r_30cqjuIIQIr-3088", // CodeQwen 1.5 7B Chat q3
      "Pr2YVrxd7VwNdg6ekC0NXWNKXxJbfTlHhhlrKbAd1dA", // Llama3 8B Instruct q4
      "jbx-H6aq7b3BbNCHlK50Jz9L-6pz9qmldrYXMwjqQVI"  // Llama3 8B Instruct q8
    ]

    // options.WeaveDrive
    options.ARWEAVE = 'https://arweave.net'
    options.mode = "test"
    options.blockHeight = 100
    options.spawn = {
      "Scheduler": "TEST_SCHED_ADDR"
    }
    options.process = {
      id: "TEST_PROCESS_ID",
      owner: "TEST_PROCESS_OWNER",
      tags: [
        { name: "Extension", value: "Weave-Drive" }
      ]
    }

    instance = await Wasm64(options)

    doHandle = instance.cwrap('handle', 'string', ['string', 'string'], { async: true })
  }

  /**
   * Since the module can be invoked multiple times, there isn't really
   * a good place to cleanup these listeners (since emscripten doesn't do it),
   * other than immediately.
   *
   * I don't really see where they are used, since CU implementations MUST
   * catch reject Promises from the WASM module, as part of evaluation.
   *
   * TODO: maybe a better way to do this
   *
   * So we immediately remove any listeners added by Module,
   * in order to prevent memory leaks
   */
  if (instance.cleanupListeners) {
    instance.cleanupListeners()
  }
  if (!options.format === "wasm64-unknown-emscripten-draft_2024_02_15") {
    doHandle = instance.cwrap('handle', 'string', ['string', 'string'])
  }


  return async (buffer, msg, env) => {
    const originalRandom = Math.random
    // const OriginalDate = Date
    const originalLog = console.log
    try {
      /** start mock Math.random */
      Math.random = function () { return 0.5 }
      /** end mock Math.random */

      /** start mock console.log */
      //console.log = function () { return null }
      /** end mock console.log */

      if (buffer) {
        if (instance.HEAPU8.byteLength < buffer.byteLength) instance.resizeHeap(buffer.byteLength)
        instance.HEAPU8.set(buffer)
      }
      /**
       * Make sure to refill the gas tank for each invocation
       */
      instance.gas.refill()

      // Sending binary data to AOS is best done with base64
      // You do have to decode it from base64 in lua, but that can
      // be done with require('.base64').decode(msg.Data)
      //
      // if application/octet-stream convert to base64
      if (msg.Tags.find(t => t.name == 'Content-Type')?.value == 'application/octet-stream') {
        function uint8ArrayToBase64(uint8Array) {
          // Convert Uint8Array to a binary string. Each byte is converted to a char.
          const binaryString = new Uint8Array(uint8Array).reduce((acc, byte) => acc + String.fromCharCode(byte), '');

          // Encode the binary string to Base64 using btoa
          return btoa(binaryString);
        }
        msg.Data = uint8ArrayToBase64(msg.Data)
      }
      const res = await doHandle(JSON.stringify(msg), JSON.stringify(env))
      const { ok, response } = JSON.parse(res)
      if (!ok) throw response

      /** unmock functions */
      // eslint-disable-next-line no-global-assign
      // Date = OriginalDate
      Math.random = originalRandom
      console.log = originalLog
      /** end unmock */

      return {
        Memory: instance.HEAPU8.slice(),
        Error: response.Error,
        Output: response.Output,
        Messages: response.Messages,
        Spawns: response.Spawns,
        Assignments: response.Assignments,
        GasUsed: instance.gas.used
      }
    } finally {
      // eslint-disable-next-line no-global-assign
      // Date = OriginalDate
      Math.random = originalRandom
      console.log = originalLog
      buffer = null
    }
  }
}
