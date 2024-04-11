const Emscripten = require('./formats/emscripten.cjs')
const Emscripten2 = require('./formats/emscripten2.cjs')

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
  if (options === null) {
    options = { format: 'wasm32-unknown-emscripten' }
  }
  if (options.format === "wasm32-unknown-emscripten") {
    instance = await Emscripten(binary, options)
  } else if (options.format === "wasm32-unknown-emscripten2") {
    instance = await Emscripten2(binary, options)
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
  instance.cleanupListeners()
  const doHandle = instance.cwrap('handle', 'string', ['string', 'string'])

  return (buffer, msg, env) => {
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
        if (instance.HEAPU8.byteLength < buffer.byteLength) instance.resizeHeap(buffer.byteLength)
        instance.HEAPU8.set(buffer)
      }
      /**
       * Make sure to refill the gas tank for each invocation
       */
      instance.gas.refill()
      const { ok, response } = JSON.parse(doHandle(JSON.stringify(msg), JSON.stringify(env)))
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
