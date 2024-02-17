import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, prop } from 'ramda'
import { z } from 'zod'

import { moduleSchema } from '../model.js'
import { randomBytes } from 'node:crypto'

const moduleDocSchema = z.object({
  _id: z.string().min(1),
  moduleId: moduleSchema.shape.id,
  tags: moduleSchema.shape.tags,
  owner: moduleSchema.shape.owner,
  type: z.literal('module')
})

function createModuleId ({ moduleId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `module-${moduleId}`
}

export function saveModuleWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('ao-module:saveModule')

  return (module) => {
    return of(module)
      .chain(fromPromise(async (module) =>
        applySpec({
          _id: (module) => createModuleId({ moduleId: module.id }),
          moduleId: prop('id'),
          tags: prop('tags'),
          owner: prop('owner'),
          type: always('module')
        })(module)
      ))
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
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bichain(
            (err) => {
              /**
               * Already exists, so just return the doc
               */
              if (err.status === 409) return Resolved(doc)
              return Rejected(err)
            },
            Resolved
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findModuleWith ({ pouchDb }) {
  return ({ moduleId }) => {
    return of({ moduleId })
      .chain(fromPromise(() => pouchDb.get(createModuleId({ moduleId }))))
      .bichain(
        (err) => {
          if (err.status === 404) return Rejected({ status: 404, message: 'Module not found' })
          return Rejected(err)
        },
        (found) => of(found)
          /**
           * Ensure the input matches the expected
           * shape
           */
          .map(moduleDocSchema.parse)
          .map(applySpec({
            id: prop('moduleId'),
            tags: prop('tags'),
            owner: prop('owner')
          }))
      )
      .toPromise()
  }
}

export function evaluatorWith ({ evaluate }) {
  return ({ moduleId, gas, memLimit }) => of({ moduleId, gas, memLimit })
    /**
     * Create an evaluator function scoped to this particular
     * stream of messages
     */
    .map(() => {
      const streamId = randomBytes(8).toString('hex')
      return ({ name, processId, Memory, message, AoGlobal }) =>
        evaluate({ streamId, moduleId, gas, memLimit, name, processId, Memory, message, AoGlobal })
    })
    .toPromise()
}
