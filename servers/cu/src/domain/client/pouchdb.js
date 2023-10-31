import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, map, prop } from 'ramda'
import { z } from 'zod'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import LevelDb from 'pouchdb-adapter-leveldb'

import { evaluationSchema, processSchema } from '../model.js'

/**
 * An implementation of the db client using pouchDB
 */

export function createPouchDbClient ({ maxListeners, path }) {
  PouchDb.plugin(LevelDb)
  PouchDb.plugin(PouchDbFind)
  const internalPouchDb = new PouchDb(path, { adapter: 'leveldb' })
  PouchDb.setMaxListeners(maxListeners)

  return internalPouchDb
}

const processDocSchema = z.object({
  _id: processSchema.shape.id,
  owner: processSchema.shape.owner,
  tags: processSchema.shape.tags,
  block: processSchema.shape.block,
  type: z.literal('process')
})

const evaluationDocSchema = z.object({
  _id: z.string().min(1),
  sortKey: evaluationSchema.shape.sortKey,
  parent: z.string().min(1),
  evaluatedAt: evaluationSchema.shape.evaluatedAt,
  message: evaluationSchema.shape.message,
  output: evaluationSchema.shape.output,
  type: z.literal('evaluation')
})

function createEvaluationId ({ processId, sortKey }) {
  return [processId, sortKey].join(',')
}

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

export function findProcessWith ({ pouchDb }) {
  return ({ processId }) => of(processId)
    .chain(fromPromise(id => pouchDb.get(id)))
    .map(processDocSchema.parse)
    .map(applySpec({
      id: prop('_id'),
      owner: prop('owner'),
      tags: prop('tags'),
      block: prop('block')
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
        block: prop('block'),
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

export function findLatestEvaluationWith ({ pouchDb }) {
  function createSelector ({ processId, to }) {
    /**
     * By using the max collation sequence, this will give us all docs whose _id
     * is prefixed with the processId id
     */
    const selector = {
      _id: {
        $gte: `${processId},`,
        $lte: createEvaluationId({ processId, sortKey: COLLATION_SEQUENCE_MAX_CHAR })
      }
    }
    /**
     * overwrite upper range with actual sortKey, since we have it
     */
    if (to) selector._id.$lte = createEvaluationId({ processId, sortKey: to })
    return selector
  }

  return ({ processId, to }) => {
    return of({ processId, to })
      .map(createSelector)
      .chain(fromPromise((selector) => {
        /**
         * Find the most recent evaluation:
         * - sort key less than or equal to the sort key we're interested in
         *
         * This will give us the most recent evaluation
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
      .chain((doc) => doc ? Resolved(doc) : Rejected(undefined))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(evaluationDocSchema.parse)
      .map(applySpec({
        sortKey: prop('sortKey'),
        processId: prop('parent'),
        message: prop('message'),
        output: prop('output'),
        evaluatedAt: prop('evaluatedAt')
      }))
      .toPromise()
  }
}

export function saveEvaluationWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('pouchDb:saveEvaluation')

  return (evaluation) => {
    return of(evaluation)
      .map(applySpec({
        /**
         * The processId concatenated with the sortKey
         * is used as the _id for an evaluation
         *
         * This makes it easier to query using a range query against the
         * primary index
         */
        _id: (evaluation) =>
          createEvaluationId({
            processId: evaluation.processId,
            sortKey: evaluation.sortKey
          }),
        sortKey: prop('sortKey'),
        parent: prop('processId'),
        message: prop('message'),
        output: prop('output'),
        evaluatedAt: prop('evaluatedAt'),
        type: always('evaluation')
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(evaluationDocSchema.parse)
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
                .map(logger.tap('Evaluation already existed in cache. Returning found evaluation'))
              : of(doc).chain(fromPromise((doc) => pouchDb.put(doc)))
                .bimap(
                  logger.tap('Encountered an error when caching evaluation'),
                  logger.tap('Cached evaluation')
                )
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findEvaluationsWith ({ pouchDb }) {
  function createSelector ({ processId, from, to }) {
    /**
     * grab all evaluations for the processId, by default
     */
    const selector = {
      _id: {
        $gte: `${processId},`,
        $lte: createEvaluationId({ processId, sortKey: COLLATION_SEQUENCE_MAX_CHAR })
      }
    }

    /**
     * trim range using sort keys, if provided
     */
    if (from) selector._id.$gte = `${createEvaluationId({ processId, sortKey: from })},`
    if (to) selector._id.$lte = `${createEvaluationId({ processId, sortKey: to })},${COLLATION_SEQUENCE_MAX_CHAR}`

    return selector
  }

  return ({ processId, from, to }) => {
    return of({ processId, from, to })
      .map(createSelector)
      .chain(fromPromise((selector) => {
        return pouchDb.find({
          selector,
          sort: [{ _id: 'desc' }],
          limit: Number.MAX_SAFE_INTEGER
        }).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(
        map(applySpec({
          sortKey: prop('sortKey'),
          processId: prop('parent'),
          message: prop('message'),
          output: prop('output'),
          evaluatedAt: prop('evaluatedAt')
        }))
      )
      .toPromise()
  }
}
