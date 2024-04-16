import { randomBytes } from 'node:crypto'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, defaultTo, evolve, head, prop } from 'ramda'
import { z } from 'zod'

import { moduleSchema } from '../model.js'
import { MODULES_TABLE } from './sqlite.js'

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

export function evaluatorWith ({ evaluate }) {
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

              args.streamId = streamId
              args.moduleId = moduleId
              args.moduleOptions = moduleOptions

              return evaluate(args)
            })
      }))
      .toPromise()
}
