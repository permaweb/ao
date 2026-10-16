const Emscripten = require('./formats/emscripten.cjs')
const Emscripten2 = require('./formats/emscripten2.cjs')
const Emscripten3 = require('./formats/emscripten3.cjs')
const Emscripten4 = require('./formats/emscripten4.cjs')
const Wasm64 = require('./formats/wasm64-emscripten.cjs')
const metering = require('@permaweb/wasm-metering') // Re-enabled metering
// const metering = require('@permaweb/wasm-metering')

/* eslint-enable */

/**
 * @typedef Tag
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef Message
 * @property {string} Id
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
 * @property {Message} Process
 */

/**
 * @typedef HandleResponse
 * @property {ArrayBuffer} Memory
 * @property {DataItem} Output
 * @property {Message[]} Messages
 * @property {Message[]} Spawns
 * @property {Patches[]} Patches
 * @property {AssignmentTypes.Assignment[]} Assignments
 */

/**
 * @callback handleFunction
 * @param {ArrayBuffer | null} buffer
 * @param {Message} msg
 * @param {Environment} env
 * @returns {Promise<HandleResponse>}
 */

/**
 * @typedef {'wasm32-unknown-emscripten'|
 * 'wasm32-unknown-emscripten2'|
 * 'wasm32-unknown-emscripten3'|
 * 'wasm64-unknown-emscripten-draft_2024_02_15'} BinaryFormat
 */

/**
 * @typedef Options
 * @property {BinaryFormat} [format]
 * @property {number} [computeLimit]
 * @property {string} [memoryLimit]
 * @property {string[]} [extensions]
 */

/**
 * @param {ArrayBuffer} binary
 * @param {Options} [options]
 * @returns {Promise<handleFunction>}
 */

/*
 * This implementation overrides WebAssembly.compileStreaming to add metering 
 * to WebAssembly binaries. Metering enables tracking of resource usage (e.g., 
 * CPU or memory) within the WebAssembly runtime, which is critical for monitoring 
 * performance and managing resource allocation in constrained environments.
 *
 * Why Metering?
 * The CU (Compute Unit) calls WebAssembly.compileStreaming to execute WebAssembly 
 * modules, but to centralize and streamline metering, we handle it here in the loader 
 * instead of within each CU instance. By integrating metering directly into the 
 * loader, we ensure that all WebAssembly binaries are metered consistently across 
 * different CUs, reducing redundancy and enhancing modularity.
*/
// Save the original WebAssembly.compile and compileStreaming functions
const originalCompileStreaming = WebAssembly.compileStreaming
const originalCompile = WebAssembly.compile
const shouldApplyMetering = (importObject = {}) => {
  return ['wasm32-unknown-emscripten-metering', 'wasm64-unknown-emscripten-draft_2024_10_16-metering'].includes(importObject.format);
};

const applyMetering = (arrayBuffer, importObject) => {
  const { format } = importObject;

  const view = ArrayBuffer.isView(arrayBuffer)
    ? arrayBuffer
    : Buffer.from(arrayBuffer);

  // Determine meter type and apply metering
  const meterType = format.startsWith('wasm32') ? 'i32' : 'i64';
  const meteredView = metering.meterWASM(view, { meterType });

  return originalCompile(meteredView.buffer); // Use originalCompile (WebAssembly.compile)
};

// Override WebAssembly.compileStreaming to apply metering conditionally
WebAssembly.compileStreaming = async function (source, importObject = {}) {
  if (!shouldApplyMetering(importObject)) return originalCompileStreaming(source);

  const arrayBuffer = await source.arrayBuffer();
  return applyMetering(arrayBuffer, importObject);
};

// Override WebAssembly.compile to apply metering conditionally
WebAssembly.compile = async function (source, importObject = {}) {
  if (!shouldApplyMetering(importObject)) return originalCompile(source);
  return applyMetering(source, importObject);
};

module.exports = async function (binary, options) {
  if (options === null || typeof options === 'undefined') {
    options = { format: 'wasm32-unknown-emscripten' };
  } else if (typeof options !== 'object') {
    options = { format: 'wasm32-unknown-emscripten' };
  }

  const unsafeMemory = options.UNSAFE_MEMORY === true;

  try {
    let instance = null;
    let doHandle = null;
    let meterType;

    // Determine meterType if a metering format is potentially used
    const currentFormat = options.format || 'wasm32-unknown-emscripten';
    if (shouldApplyMetering({ format: currentFormat })) {
      meterType = currentFormat.startsWith("wasm32") ? "i32" : "i64";
    }

    if (options.format === "wasm32-unknown-emscripten") {
      instance = await Emscripten(binary, options)
      options.instantiateWasm = binary
    } else if (options.format === "wasm32-unknown-emscripten2") {
      instance = await Emscripten2(binary, options)
    } else if (options.format === "wasm32-unknown-emscripten3") {
      instance = await Emscripten3(binary, options)
    } else {
      if (typeof binary === "function") {
        options.instantiateWasm = binary
      } else {
        // Local metering for specific formats
        if (options.format === "wasm32-unknown-emscripten-metering" || options.format === "wasm64-unknown-emscripten-draft_2024_10_16-metering") {
          if (metering && meterType) {
            binary = metering.meterWASM(binary, { meterType });
          }
        }
        options.wasmBinary = binary
      }

      if (options.format === "wasm64-unknown-emscripten-draft_2024_02_15" || options.format === "wasm64-unknown-emscripten-draft_2024_10_16-metering") {
        instance = await Wasm64(options)
      } else if (options.format === "wasm32-unknown-emscripten4" || options.format === "wasm32-unknown-emscripten-metering") {
        instance = await Emscripten4(options)
      }

      await instance['FS_createPath']('/', 'data')
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

    if (options.format !== "wasm64-unknown-emscripten-draft_2024_02_15" &&
      options.format !== "wasm32-unknown-emscripten4" &&
      options.format !== "wasm32-unknown-emscripten-metering" &&
      options.format !== "wasm64-unknown-emscripten-draft_2024_10_16-metering") {
      // Ensure doHandle is assigned if not in the async:true path from above
      if (!doHandle) {
        doHandle = instance.cwrap('handle', 'string', ['string', 'string'])
      }
    }

    return async (buffer, msg, env) => {
      /**
       * instance is the Module
       * abstraction for the WebAssembly environnment
       * 
       * This is where things like module options, extensions
       * and other metadata are exposed to things like WeaveDrive.
       * 
       * So by setting blockHeight on the instance to the current
       * msg's blockHeight, it can be made available to WeaveDrive
       * for admissable checks
       */
      instance.blockHeight = msg['Block-Height']

      const originalRandom = Math.random
      // const OriginalDate = Date
      const originalLog = console.log
      try {
        /** start mock Math.random */
        Math.random = function () { return 0.5 }
        /** end mock Math.random */

        /** start mock console.log */
        console.log = function () { return null }
        /** end mock console.log */

        if (buffer) {
          if (instance.HEAPU8.byteLength < buffer.byteLength) {
            console.log("RESIZE HEAP")
            instance.resizeHeap(buffer.byteLength)
          }
          instance.HEAPU8.set(buffer)
        }
        /**
         * Make sure to refill the gas tank for each invocation
         */
        if (instance.gas && typeof instance.gas.refill === 'function') {
          instance.gas.refill();
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

        const result = {
          Memory: unsafeMemory ? instance.HEAPU8.buffer : instance.HEAPU8.slice(), // Conditional memory return
          Error: response.Error,
          Output: response.Output,
          Messages: response.Messages,
          Spawns: response.Spawns,
          Assignments: response.Assignments,
          Patches: response.Patches || [],
        };

        // Add GasUsed if metering was applied
        if (instance.gas && typeof instance.gas.used !== 'undefined') {
          result.GasUsed = instance.gas.used;
        }

        /** unmock functions */
        // eslint-disable-next-line no-global-assign
        // Date = OriginalDate
        Math.random = originalRandom
        console.log = originalLog
        /** end unmock */
        buffer = null // Clear buffer reference

        return result;
      } // End of try block
      finally { }
    };
  } // End of outer try block
  finally { }
};
