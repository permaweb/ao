import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, prop } from 'ramda'
import { z } from 'zod'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import LevelDb from 'pouchdb-adapter-leveldb'

import { rawTagSchema } from '../model.js'

/**
 * An implementation of the db client using pouchDB
 */

PouchDb.plugin(LevelDb)
PouchDb.plugin(PouchDbFind)
const internalPouchDb = new PouchDb('ao-cache', { adapter: 'leveldb' })
PouchDb.setMaxListeners(50)

export { internalPouchDb as pouchDb }

const processDocSchema = z.object({
  _id: z.string().min(1),
  owner: z.string().min(1),
  tags: z.array(rawTagSchema),
  type: z.literal('process')
})

export function findProcessWith ({ pouchDb }) {
  return ({ processId }) => of(processId)
    .chain(fromPromise(id => pouchDb.get(id)))
    .map(processDocSchema.parse)
    .map(applySpec({
      id: prop('_id'),
      owner: prop('owner'),
      tags: prop('tags')
    }))
    .toPromise()
}

export function saveProcessWith ({ pouchDb }) {
  return (process) => {
    return of(process)
      .map(applySpec({
        _id: prop('id'),
        owner: prop('owner'),
        tags: prop('tags'),
        type: always('process')
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(processDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.get(doc._id)))
          .bichain(
            (err) => {
              if (err.status === 404) return Resolved(undefined)
              return Rejected(err)
            },
            Resolved
          )
          .chain((found) =>
            found
              ? of(found)
              : of(doc).chain(fromPromise((doc) => pouchDb.put(doc)))
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}
