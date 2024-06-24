import { randomBytes } from 'node:crypto'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, defaultTo, evolve, head, prop } from 'ramda'
import { z } from 'zod'

import { ARR_BUFFER_MAX_SIZE, concatArrayBuffers, splitArrayBuffer } from '../utils.js'
import { moduleSchema } from '../model.js'
import { MODULES_TABLE } from './sqlite.js'
import { timer } from './metrics.js'

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

export function evaluatorWith ({ evaluate, logger }) {
  logger = logger.child('evaluator')
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

        function maybeSplitMemory (args) {
          if (args.Memory && args.Memory.byteLength > ARR_BUFFER_MAX_SIZE) {
            logger('Splitting Large process memory into chunks...')
            const { stop: stopTimer } = timer('splitArrayBuffer', { streamId, byteLength: args.Memory.byteLength })
            args.Memory = splitArrayBuffer(args.Memory, ARR_BUFFER_MAX_SIZE)
            stopTimer()
            args.isSplitMemory = true
          }

          return args
        }

        function maybeConcatMemory (output) {
          if (!output.isSplitMemory) return output

          logger('Concatenating Large process memory from chunks...')
          const { stop: stopTimer } = timer('concatArrayBuffers', { streamId })
          output.Memory = concatArrayBuffers(output.Memory)
          stopTimer()

          return output
        }

        return (args) =>
          Promise.resolve(!(backpressure = ++backpressure % EVAL_DEFER_BACKPRESSURE))
            .then(async (defer) => {
              /**
               * defer the next wasm module invocation to the
               * end of the current event queue.
               *
               * We may want to defer to prevent starvation of other tasks on the main thread
               */
              if (defer) await new Promise(resolve => setImmediate(resolve))

              /**
               * TODO: maybe use to pass options into worker ie.
               * transferList
               */
              const options = undefined

              args.streamId = streamId
              args.moduleId = moduleId
              args.moduleOptions = moduleOptions

              /**
               * TOTAL HACK to get large process memory working.
               *
               * There is a bug in NodeJS that prevents structured cloning of
               * an ArrayBuffer larger than 4GB. So in cases where the process Memory
               * is >4GB we split it into multiple ArrayBuffers when passing into the worker
               * (see maybeSplitMemory)
               *
               * and then concetenate it again when we receive it (see maybeConcatMemory)
               */
              args = maybeSplitMemory(args)

              return evaluate(args, options)
                /**
                 * TOTAL HACK to get large process memory working.
                 *
                 * There is a bug in NodeJS that prevents structured cloning of
                 * an ArrayBuffer larger than 4GB. So in cases where the process Memory
                 * is >4GB we split it into multiple ArrayBuffers when passing into the worker
                 * (see maybeSplitMemory)
                 *
                 * and then concetenate it again when we receive it (see maybeConcatMemory)
                 */
                .then(maybeConcatMemory)
            })
      }))
      .toPromise()
}
