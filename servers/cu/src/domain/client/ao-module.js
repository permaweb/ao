import { randomBytes } from 'node:crypto'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, defaultTo, evolve, head, prop } from 'ramda'
import { z } from 'zod'

import { arrayBufferFromMaybeView } from '../utils.js'
import { moduleSchema } from '../model.js'
import { MODULES_TABLE } from './sqlite.js'
import { timer } from './metrics.js'

const TWO_GB = 2 * 1024 * 1024 * 1024

const moduleDocSchema = z.object({
  id: z.string().min(1),
  tags: moduleSchema.shape.tags,
  owner: moduleSchema.shape.owner
})

export function saveModuleWith ({ db, logger: _logger }) {
  const logger = _logger.child('ao-module:saveModule')

  function createQuery (module) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${MODULES_TABLE}
        (id, tags, owner)
        VALUES (?, ?, ?)
      `,
      parameters: [
        module.id,
        JSON.stringify(module.tags),
        module.owner
      ]
    }
  }

  return (module) => {
    return of(module)
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(moduleDocSchema.parse)
      .map((moduleDoc) => {
        logger('Creating module doc for module "%s"', module.id)
        return moduleDoc
      })
      .chain((doc) =>
        of(doc)
          .map(createQuery)
          .chain(fromPromise((query) => db.run(query)))
          .map(always(doc.id))
      )
      .toPromise()
  }
}

export function findModuleWith ({ db }) {
  function createQuery ({ moduleId }) {
    return {
      sql: `
        SELECT id, tags, owner
        FROM ${MODULES_TABLE}
        WHERE
          id = ?
      `,
      parameters: [moduleId]
    }
  }
  return ({ moduleId }) => of(moduleId)
    .chain(fromPromise((id) => db.query(createQuery({ moduleId: id }))))
    .map(defaultTo([]))
    .map(head)
    .chain((row) => row ? Resolved(row) : Rejected({ status: 404, message: 'Module not found' }))
    .map(evolve({
      tags: JSON.parse
    }))
    .map(moduleDocSchema.parse)
    .map(applySpec({
      id: prop('id'),
      tags: prop('tags'),
      owner: prop('owner')
    }))
    .toPromise()
}

export function evaluatorWith ({ evaluate, loadWasmModule }) {
  const EVAL_DEFER_BACKPRESSURE = 10
  return ({ moduleId, moduleOptions }) =>
    of(moduleOptions)
    /**
     * Create an evaluator function scoped to this particular
     * stream of messages
     */
      .chain(fromPromise(async (moduleOptions) => {
        const streamId = await new Promise((resolve, reject) =>
          randomBytes(8, (err, buffer) => err ? reject(err) : resolve(buffer.toString('hex')))
        )

        let backpressure = 0

        /**
         * TODO: should this be moved to lib/loadModule?
         */
        let wasmModule

        return (args) =>
          Promise.resolve(!(backpressure = ++backpressure % EVAL_DEFER_BACKPRESSURE))
            .then(async (defer) => {
              if (!wasmModule) wasmModule = await loadWasmModule({ moduleId })
              return defer
            })
            .then(async (defer) => {
              let options
              /**
               * defer the next wasm module invocation to the
               * end of the current event queue.
               *
               * We may want to defer to prevent starvation of other tasks on the main thread
               */
              if (defer) await new Promise(resolve => setImmediate(resolve))

              if (args.Memory) {
                /**
                 * The ArrayBuffer is transferred to the worker as part of performing
                 * an evaluation. This transfer will subsequently detach any views, Buffers,
                 * and more broadly, references to the ArrayBuffer on this thread.
                 *
                 * So if this is the first eval being performed for the eval stream,
                 * then we copy the contents of the ArrayBuffer. That way, we can be sure
                 * that no references on the main thread will be affected during the eval stream
                 * transfers happening back and forth. This effectively give's each eval stream
                 * it's own ArrayBuffer to pass back and forth.
                 *
                 * (this is no worse than the structured clone that was happening before
                 * as part of message passing. But instead, the clone is only performed once,
                 * instead of on each evaluation)
                 *
                 * TODO: perhaps there is a way to somehow lock the ArrayBuffer usage
                 * instead of copying on first evaluation. We have to be careful that nothing
                 * (ie. a view of the ArrayBuffer in a Wasm Instnace dryrun)
                 * inadvertantly mutates the underlying ArrayBuffer
                 */
                if (args.first) {
                  let stopTimer = () => {}
                  if (args.Memory.byteLength > TWO_GB) {
                    stopTimer = timer('copyLargeMemory', {
                      streamId,
                      processId: args.processId,
                      byteLength: args.Memory.byteLength
                    }).stop
                  }
                  /**
                   * We must pass a view into copyBytesFrom,
                   *
                   * so we first check whether it already is or not,
                   * and create one on top of the ArrayBuffer if necessary
                   *
                   * (NodeJS' Buffer is a subclass of DataView)
                   */
                  args.Memory = ArrayBuffer.isView(args.Memory)
                    ? Buffer.copyBytesFrom(args.Memory)
                    : Buffer.copyBytesFrom(new Uint8Array(args.Memory))
                  stopTimer()
                }

                /**
                 * If Memory is sufficiently large, transferring the View somehow
                 * causes the underlying ArrayBuffer to be truncated. This truncation
                 * does not occur when instead the underlying ArrayBuffer is transferred,
                 * directly.
                 *
                 * So we always ensure the Memory transferred to the worker thread
                 * is the actual ArrayBuffer, and not a View.
                 *
                 * (the same is done in the opposite direction in the worker thread)
                 *
                 * TODO: maybe AoLoader should be made to return the underlying ArrayBuffer
                 * as Memory, instead of a View?
                 */
                args.Memory = arrayBufferFromMaybeView(args.Memory)

                options = { transfer: [args.Memory] }
              }

              args.streamId = streamId
              args.moduleId = moduleId
              args.moduleOptions = moduleOptions
              args.wasmModule = wasmModule

              return evaluate(args, options)
            })
      }))
      .toPromise()
}
