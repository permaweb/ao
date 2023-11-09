import { deflate, inflate } from 'node:zlib'
import { promisify } from 'node:util'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, lensPath, map, omit, pipe, prop, set } from 'ramda'
import { z } from 'zod'

import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import LevelDb from 'pouchdb-adapter-leveldb'

import { evaluationSchema, processSchema } from '../model.js'

const deflateP = promisify(deflate)
const inflateP = promisify(inflate)

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

  const foundEvaluationDocSchema = z.object({
    _id: z.string().min(1),
    sortKey: evaluationSchema.shape.sortKey,
    parent: z.string().min(1),
    evaluatedAt: evaluationSchema.shape.evaluatedAt,
    output: evaluationSchema.shape.output,
    type: z.literal('evaluation')
  })

  const bufferLens = lensPath(['output', 'buffer'])

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
       * Also retrieve the state buffer, persisted as an attachment
       * and set it on the output.buffer field to match the expected output shape
       */
      .chain(fromPromise(async (doc) => {
        const buffer = await pouchDb.getAttachment(doc._id, 'buffer.txt')
        /**
         * Make sure to decompress the state buffer
         */
        return set(bufferLens, await inflateP(buffer), doc)
      }))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(foundEvaluationDocSchema.parse)
      .map(applySpec({
        sortKey: prop('sortKey'),
        processId: prop('parent'),
        output: prop('output'),
        evaluatedAt: prop('evaluatedAt')
      }))
      .toPromise()
  }
}

export function saveEvaluationWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('pouchDb:saveEvaluation')

  const savedEvaluationDocSchema = z.object({
    _id: z.string().min(1),
    sortKey: evaluationSchema.shape.sortKey,
    parent: z.string().min(1),
    evaluatedAt: evaluationSchema.shape.evaluatedAt,
    /**
     * Omit buffer from the document schema (see _attachments below)
     */
    output: evaluationSchema.shape.output.omit({ buffer: true }),
    type: z.literal('evaluation'),
    /**
     * Since Bibo, the state of a process is a buffer, so we will store it as
     * a document attachment in PouchDb, then reassemable the evaluation shape
     * when it is used as a start point for eval (see findEvaluation)
     *
     * See https://pouchdb.com/api.html#save_attachment
     */
    _attachments: z.object({
      'buffer.txt': z.object({
        content_type: z.literal('text/plain'),
        data: z.any()
      })
    })
  })

  return (evaluation) => {
    return of(evaluation)
      .chain(fromPromise(async (evaluation) =>
        applySpec({
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
          output: pipe(
            prop('output'),
            /**
             * Make sure to omit the buffer from the output field
             * on the document. We will instead persist the state buffer
             * as an attachment (see below)
             */
            omit(['buffer'])
          ),
          evaluatedAt: prop('evaluatedAt'),
          type: always('evaluation'),
          /**
           * Store the state produced from the evaluation
           * as an attachment. This allows for efficient storage
           * and retrieval of the Buffer
           *
           * See https://pouchdb.com/api.html#save_attachment
           */
          _attachments: always({
            'buffer.txt': {
              content_type: 'text/plain',
              /**
               * zlib compress the buffer before persisting
               *
               * In testing, this results in orders of magnitude
               * smaller buffer and smaller persistence times
               */
              data: await deflateP(evaluation.output.buffer)
            }
          })
        })(evaluation)
      ))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(savedEvaluationDocSchema.parse)
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
          sort: [{ _id: 'asc' }],
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
          output: prop('output'),
          evaluatedAt: prop('evaluatedAt')
        }))
      )
      .toPromise()
  }
}
