import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, prop } from 'ramda'
import { z } from 'zod'

import { processSchema } from '../model.js'

const processDocSchema = z.object({
  _id: z.string().min(1),
  processId: processSchema.shape.id,
  signature: processSchema.shape.signature,
  data: processSchema.shape.data,
  anchor: processSchema.shape.anchor,
  owner: processSchema.shape.owner,
  tags: processSchema.shape.tags,
  block: processSchema.shape.block,
  type: z.literal('process')
})

function createProcessId ({ processId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `proc-${processId}`
}

export function findProcessWith ({ pouchDb }) {
  return ({ processId }) => of(processId)
    .chain(fromPromise(id => pouchDb.get(createProcessId({ processId: id }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404, message: 'Process not found' })
        return Rejected(err)
      },
      (found) => of(found)
        .map(processDocSchema.parse)
        .map(applySpec({
          id: prop('processId'),
          signature: prop('signature'),
          data: prop('data'),
          anchor: prop('anchor'),
          owner: prop('owner'),
          tags: prop('tags'),
          block: prop('block')
        }))
    )
    .toPromise()
}

export function saveProcessWith ({ pouchDb }) {
  return (process) => {
    return of(process)
      .map(applySpec({
        _id: process => createProcessId({ processId: process.id }),
        processId: prop('id'),
        signature: prop('signature'),
        data: prop('data'),
        anchor: prop('anchor'),
        owner: prop('owner'),
        tags: prop('tags'),
        block: prop('block'),
        type: always('process')
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(processDocSchema.parse)
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
