import { T, always, applySpec, assocPath, cond, defaultTo, identity, ifElse, is, mergeAll, pathOr, pipe, propOr } from 'ramda'
import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import WeaveDrive from '@permaweb/weavedrive'

import { saveEvaluationSchema } from '../dal.js'

const WASM_64_FORMAT = 'wasm64-unknown-emscripten-draft_2024_02_15'

export function evaluateWith ({
  loadWasmModule,
  wasmInstanceCache,
  bootstrapWasmInstance,
  saveEvaluation,
  addExtension,
  ARWEAVE_URL,
  logger
}) {
  loadWasmModule = fromPromise(loadWasmModule)
  bootstrapWasmInstance = fromPromise(bootstrapWasmInstance)
  saveEvaluation = fromPromise(saveEvaluationSchema.implement(saveEvaluation))

  function loadInstance ({ streamId, moduleId, moduleOptions }) {
    return loadWasmModule({ moduleId })
      /**
       * Map extension apis to moduleOptions
       * TODO: cleanup
       */
      .chain((wasmModule) =>
        of(moduleOptions)
          .chain(fromPromise((moduleOptions) => {
            return Promise.all(Object.keys(moduleOptions.extensions)
              .map((extension) => addExtension({ extension })))
              /**
               * Always add the WeaveDrive extension if the module
               * format is wasm 64
               */
              .then((apis) => {
                if (moduleOptions.format === WASM_64_FORMAT) { apis.push({ WeaveDrive, ARWEAVE: ARWEAVE_URL }) }
                return apis
              })
              /**
               * Expose all Extension apis on the moduleOptions
               */
              .then((apis) => mergeAll([moduleOptions, ...apis]))
          }))
          .map((moduleOptions) => [wasmModule, moduleOptions])
      )
      .chain(([wasmModule, moduleOptions]) => bootstrapWasmInstance(wasmModule, moduleOptions))
      /**
       * Cache the wasm module for this particular stream,
       * in memory, for quick retrieval next time
       */
      .map((wasmInstance) => {
        wasmInstanceCache.set(streamId, wasmInstance)
        return wasmInstance
      })
  }

  function maybeCachedInstance (args) {
    const { streamId } = args

    return of(streamId)
      .map((streamId) => wasmInstanceCache.get(streamId))
      .chain((wasmInstance) => wasmInstance
        ? Resolved(wasmInstance)
        : Rejected(args)
      )
  }

  /**
   * Given the previous interaction output,
   * return a function that will merge the next interaction output
   * with the previous.
   */
  const mergeOutput = (prevMemory, name, processId) => pipe(
    defaultTo({}),
    applySpec({
      /**
       * If the output contains an error, ignore its state,
       * and use the previous evaluation's state
       */
      Memory: ifElse(
        pathOr(undefined, ['Error']),
        always(prevMemory),
        (res) => {
          const output = cond([
            [is(String), identity],
            /**
             * aos output is an object, whose data field contains output
             */
            [is(Object), pathOr('', ['data', 'output'])],
            [is(Number), String],
            [T, always('')]
          ])(res.Output || '')

          /**
           * detect module buffer allocation error present
           * in older modules.
           *
           * If detected, log, and use the previous memory
           */
          if (typeof output === 'string' && output.endsWith('not enough memory for buffer allocation')) {
            logger(
              'WASM MEMORY ERROR: Detected buffer allocation error in Output for message "%s" sent to process "%s". Mapping to an error.',
              name,
              processId
            )
            return prevMemory
          }

          return propOr(prevMemory, 'Memory', res)
        }
      ),
      Error: pathOr(undefined, ['Error']),
      Messages: pathOr([], ['Messages']),
      Assignments: pathOr([], ['Assignments']),
      Spawns: pathOr([], ['Spawns']),
      Output: pipe(
        pathOr('', ['Output']),
        /**
         * Always make sure Output
         * is a string or object
         */
        cond([
          [is(String), identity],
          [is(Object), identity],
          [is(Number), String],
          [T, identity]
        ])
      ),
      GasUsed: pathOr(undefined, ['GasUsed'])
    })
  )

  /**
   * Evaluate a message using the handler that wraps the WebAssembly.Instance,
   * identified by the streamId.
   *
   * If not already instantiated and cached in memory, attempt to use a cached WebAssembly.Module
   * and instantiate the Instance and handler, caching it by streamId
   *
   * If the WebAssembly.Module is not cached, then we check if the binary is cached in a file,
   * then compile it in a WebAssembly.Module, cached in memory, then used to instantiate a
   * new WebAssembly.Instance
   *
   * If not in a file, then the module transaction is downloaded from the Gateway url,
   * cached in a file, compiled, further cached in memory, then used to instantiate a
   * new WebAssembly.Instance and handler
   *
   * Finally, evaluates the message and returns the result of the evaluation.
   */
  return ({ streamId, moduleId, moduleOptions, processId, noSave, name, deepHash, cron, ordinate, isAssignment, Memory, message, AoGlobal }) =>
    /**
     * Dynamically load the module, either from cache,
     * or from a file
     */
    maybeCachedInstance({ streamId, moduleId, moduleOptions, name, processId, Memory, message, AoGlobal })
      .bichain(loadInstance, Resolved)
      /**
       * Perform the evaluation
       */
      .chain((wasmInstance) =>
        of(wasmInstance)
          .map((wasmInstance) => {
            logger('Evaluating message "%s" to process "%s"', name, processId)
            return wasmInstance
          })
          .chain(fromPromise(async (wasmInstance) => wasmInstance(Memory, message, AoGlobal)))
          .bichain(
            /**
             * Map thrown error to a result.error. In this way, the Worker should _never_
             * throw due to evaluation
             *
             * TODO: should we also evict the wasmInstance from cache, so it's reinstantaited
             * with the new memory for next time?
             */
            (err) => Resolved(assocPath(['Error'], err, {})),
            Resolved
          )
          .map(mergeOutput(Memory, name, processId))
          .chain((output) => {
            /**
             * Noop saving the evaluation is noSave flag is set
             */
            if (noSave) return Resolved(output)

            return saveEvaluation({
              deepHash,
              cron,
              ordinate,
              isAssignment,
              processId,
              messageId: message.Id,
              timestamp: message.Timestamp,
              nonce: message.Nonce,
              epoch: message.Epoch,
              blockHeight: message['Block-Height'],
              evaluatedAt: new Date(),
              output
            })
              .bimap(
                logger.tap('Failed to save evaluation'),
                identity
              )
              /**
               * Always ensure this Async resolves
               */
              .bichain(Resolved, Resolved)
              .map(() => output)
          })
      )
      .toPromise()
}
