import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, prop } from 'ramda'
import { z } from 'zod'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import LevelDb from 'pouchdb-adapter-leveldb'

/**
 * An implementation of the db client using pouchDB
 */

PouchDb.plugin(LevelDb)
PouchDb.plugin(PouchDbFind)
const internalPouchDb = new PouchDb('ao-cache', { adapter: 'leveldb' })
PouchDb.setMaxListeners(50)

export { internalPouchDb as pouchDb }

const cachedEvaluationDocSchema = z.object({
  _id: z.string().min(1),
  sortKey: z.string().min(1),
  parent: z.string().min(1),
  action: z.record(z.any()),
  output: z.object({
    state: z.record(z.any()).optional(),
    result: z.record(z.any()).optional()
  }),
  cachedAt: z.preprocess(
    (
      arg
    ) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

/**
 * PouchDB does Comparison of string using ICU which implements the Unicode Collation Algorithm,
 * giving a dictionary sorting of keys.
 *
 * This can give surprising results if you were expecting ASCII ordering.
 * See https://docs.couchdb.org/en/stable/ddocs/views/collation.html#collation-specification
 *
 * So we use a high value unicode character to terminate a range query prefix.
 * This will cause only string with a given prefix to match a range query
 */
export const COLLATION_SEQUENCE_MAX_CHAR = '\ufff0'

function createDocId ({ contractId, sortKey }) {
  return [contractId, sortKey].join(',')
}

function createSelector ({ contractId, to }) {
  /**
   * By using the max collation sequence, this will give us all docs whose _id
   * is prefixed with the contract id
   */
  const selector = {
    _id: {
      $gte: contractId,
      $lte: createDocId({ contractId, sortKey: COLLATION_SEQUENCE_MAX_CHAR })
    }
  }
  /**
   * overwrite upper range with actual sortKey, since we have it
   */
  if (to) selector._id.$lte = createDocId({ contractId, sortKey: to })
  return selector
}

export function findLatestEvaluationWith (
  { pouchDb }
) {
  return ({ id, to }) => {
    return of({ contractId: id, to })
      .map(createSelector)
      .chain(fromPromise((selector) => {
        /**
         * Find the most recent interaction that produced state:
         * - sort key less than or equal to the sort key we're interested in
         *
         * This will give us the cached most recent interaction evaluation that produced a state change
         */
        return pouchDb.find({
          selector,
          sort: [{ _id: 'desc' }],
          limit: 1
        }).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(head)
      .chain((doc) => doc ? Resolved(doc) : Rejected(doc))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(cachedEvaluationDocSchema.parse)
      .map(applySpec({
        sortKey: prop('sortKey'),
        parent: prop('parent'),
        action: prop('action'),
        output: prop('output'),
        cachedAt: prop('cachedAt')
      }))
      .bichain(Resolved, Resolved)
      .toPromise()
  }
}

export function saveEvaluationWith (
  { pouchDb, logger: _logger }
) {
  const logger = _logger.child('saveEvaluation')
  return (evaluation) => {
    return of(evaluation)
      .map(applySpec({
        /**
         * The contractId concatenated with the sortKey
         * is used as the _id for the record
         */
        _id: (evaluation) =>
          createDocId({
            contractId: evaluation.parent,
            sortKey: evaluation.sortKey
          }),
        sortKey: prop('sortKey'),
        parent: prop('parent'),
        action: prop('action'),
        output: prop('output'),
        cachedAt: prop('cachedAt')
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(cachedEvaluationDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.get(doc._id)))
          .bichain(
            (err) => {
              // No cached document found
              if (err.status === 404) {
                logger(
                  'No cached document found with _id %s. Caching evaluation %O',
                  doc._id,
                  doc
                )
                return Resolved(undefined)
              }
              return Rejected(err)
            },
            Resolved
          )
          .chain((found) =>
            found
              ? of(found)
              : of(doc).chain(fromPromise((doc) => pouchDb.put(doc)))
                .bimap(
                  logger.tap('Encountered an error when caching evaluation'),
                  logger.tap('Cached evaluation')
                )
                .bichain(Resolved, Resolved)
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}
