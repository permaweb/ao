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
let internalPouchDb
export function createPouchDbClient ({ maxListeners, path }) {
  if (internalPouchDb) return internalPouchDb

  PouchDb.plugin(LevelDb)
  PouchDb.plugin(PouchDbFind)
  PouchDb.setMaxListeners(maxListeners)
  internalPouchDb = new PouchDb(path, { adapter: 'leveldb' })
  return internalPouchDb
}

const processDocSchema = z.object({
  _id: z.string().min(1),
  processId: processSchema.shape.id,
  owner: processSchema.shape.owner,
  tags: processSchema.shape.tags,
  block: processSchema.shape.block,
  type: z.literal('process')
})

const messageIdDocSchema = z.object({
  _id: z.string().min(1),
  /**
   * The _id of the corresponding cached evaluation
   */
  parent: z.string().min(1),
  type: z.literal('messageId')
})

function createEvaluationId ({ processId, sortKey }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `eval-${[processId, sortKey].join(',')}`
}

function createProcessId ({ processId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `proc-${processId}`
}

function createMessageId ({ messageId }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `messageId-${messageId}`
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
    .chain(fromPromise(id => pouchDb.get(createProcessId({ processId: id }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404 })
        return Rejected(err)
      },
      (found) => of(found)
        .map(processDocSchema.parse)
        .map(applySpec({
          id: prop('processId'),
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

export function findLatestEvaluationWith ({ pouchDb }) {
  function createSelector ({ processId, to }) {
    /**
     * By using the max collation sequence, this will give us all docs whose _id
     * is prefixed with the processId id
     */
    const selector = {
      _id: {
        $gte: createEvaluationId({ processId, sortKey: '' }),
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
    processId: evaluationSchema.shape.processId,
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
        processId: prop('processId'),
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
    deepHash: z.string().optional(),
    sortKey: evaluationSchema.shape.sortKey,
    processId: evaluationSchema.shape.processId,
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
          processId: prop('processId'),
          parent: (evaluation) => createProcessId({ processId: evaluation.processId }),
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
      .map((evaluationDoc) => {
        if (!evaluation.deepHash) return [evaluationDoc]

        logger('Creating messageId doc for deepHash "%s"', evaluation.deepHash)
        /**
         * Create an messageId doc that we can later query
         * to prevent duplicate evals from duplicate cranks
         */
        return [
          evaluationDoc,
          messageIdDocSchema.parse({
            _id: createMessageId({ messageId: evaluation.deepHash }),
            parent: evaluationDoc._id,
            type: 'messageId'
          })
        ]
      })
      .chain(docs =>
        of(docs)
          .chain(fromPromise(docs => pouchDb.bulkDocs(docs)))
          .bimap(
            logger.tap('Encountered an error when caching evaluation docs'),
            logger.tap('Successfully cached evaluation docs')
          )

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
        $gte: createEvaluationId({ processId, sortKey: '' }),
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
          processId: prop('processId'),
          output: prop('output'),
          evaluatedAt: prop('evaluatedAt')
        }))
      )
      .toPromise()
  }
}

export function findMessageIdWith ({ pouchDb }) {
  return ({ messageId }) => of(messageId)
    .chain(fromPromise(id => pouchDb.get(createMessageId({ messageId: id }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404 })
        return Rejected(err)
      },
      (found) => of(found)
        .map(messageIdDocSchema.parse)
    )
    .toPromise()
}
