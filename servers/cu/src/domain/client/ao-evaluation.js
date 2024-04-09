import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, isEmpty, isNotNil, converge, mergeAll, map, unapply, prop, head, defaultTo, evolve, pipe } from 'ramda'
import { z } from 'zod'

import { evaluationSchema } from '../model.js'
import { EVALUATIONS_TABLE, COLLATION_SEQUENCE_MAX_CHAR } from './sqlite.js'

const evaluationDocSchema = z.object({
  id: z.string().min(1),
  processId: evaluationSchema.shape.processId,
  messageId: evaluationSchema.shape.messageId,
  deepHash: evaluationSchema.shape.deepHash,
  nonce: evaluationSchema.shape.nonce,
  epoch: evaluationSchema.shape.epoch,
  timestamp: evaluationSchema.shape.timestamp,
  ordinate: evaluationSchema.shape.ordinate,
  blockHeight: evaluationSchema.shape.blockHeight,
  cron: evaluationSchema.shape.cron,
  evaluatedAt: evaluationSchema.shape.evaluatedAt,
  output: evaluationSchema.shape.output.omit({ Memory: true })
})

function createEvaluationId ({ processId, timestamp, ordinate, cron }) {
  return `${[processId, timestamp, ordinate, cron].filter(isNotNil).join(',')}`
}

const toEvaluation = applySpec({
  processId: prop('processId'),
  messageId: prop('messageId'),
  deepHash: prop('deepHash'),
  timestamp: prop('timestamp'),
  nonce: prop('nonce'),
  epoch: prop('epoch'),
  ordinate: prop('ordinate'),
  blockHeight: prop('blockHeight'),
  cron: prop('cron'),
  evaluatedAt: prop('evaluatedAt'),
  output: prop('output')
})

const fromEvaluationDoc = pipe(
  evolve({
    output: JSON.parse,
    evaluatedAt: (timestamp) => new Date(timestamp)
  }),
  /**
   * Ensure the input matches the expected
   * shape
   */
  evaluationDocSchema.parse,
  toEvaluation
)

export function findEvaluationWith ({ db }) {
  function createQuery ({ processId, timestamp, ordinate, cron }) {
    return {
      sql: `
        SELECT
          id, processId, messageId, deepHash, nonce, epoch, timestamp,
          ordinate, blockHeight, cron, evaluatedAt, output
        FROM ${EVALUATIONS_TABLE}
        WHERE
          id = ?;
      `,
      parameters: [createEvaluationId({ processId, timestamp, ordinate, cron })]
    }
  }

  return ({ processId, to, ordinate, cron }) => {
    return of({ processId, timestamp: to, ordinate, cron })
      .chain(fromPromise((params) => db.query(createQuery(params))))
      .map(defaultTo([]))
      .map(head)
      .chain((row) => row ? Resolved(row) : Rejected({ status: 404, message: 'Evaluation result not found' }))
      .map(fromEvaluationDoc)
      .toPromise()
  }
}

export function saveEvaluationWith ({ db, logger: _logger }) {
  const toEvaluationDoc = pipe(
    converge(
      unapply(mergeAll),
      [
        toEvaluation,
        (evaluation) => ({
          /**
           * The processId concatenated with the timestamp, ordinate (aka most recent nonce)
           * and the cron (if defined)
           * is used as the id for an evaluation record.
           *
           * This makes it easier to query using a range query against the
           * primary key
           */
          id: createEvaluationId({
            processId: evaluation.processId,
            timestamp: evaluation.timestamp,
            ordinate: evaluation.ordinate,
            /**
             * By appending the cron identifier to the evaluation doc id,
             * this guarantees the document will have a unique, but sortable, id
             */
            cron: evaluation.cron
          })
        })
      ]
    ),
    /**
     * Ensure the expected shape before writing to the db
     */
    evaluationDocSchema.parse
  )

  function createQuery (evaluation) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${EVALUATIONS_TABLE}
        (id, processId, messageId, deepHash, nonce, epoch, timestamp, ordinate, blockHeight, cron, evaluatedAt, output)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      parameters: [
        evaluation.id,
        evaluation.processId,
        evaluation.messageId,
        evaluation.deepHash,
        evaluation.nonce,
        evaluation.epoch,
        evaluation.timestamp,
        evaluation.ordinate,
        evaluation.blockHeight,
        evaluation.cron,
        evaluation.evaluatedAt.getTime(),
        JSON.stringify(evaluation.output)
      ]
    }
  }

  return (evaluation) => {
    return of(evaluation)
      .map(toEvaluationDoc)
      .chain((doc) =>
        of(doc)
          .map((doc) => createQuery(doc))
          .chain(fromPromise((query) => db.run(query)))
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findEvaluationsWith ({ db }) {
  function createQuery ({ processId, from, to, onlyCron, sort, limit }) {
    return {
      sql: `
        SELECT
          id, processId, messageId, deepHash, nonce, epoch, timestamp,
          ordinate, blockHeight, cron, evaluatedAt, output
        FROM ${EVALUATIONS_TABLE}
        WHERE
          id > ? AND id <= ?
          ${onlyCron ? 'AND cron IS NOT NULL' : ''}
        ORDER BY
          timestamp ${sort},
          ordinate ${sort},
          cron ${sort}
        LIMIT ?;
      `,
      parameters: [
        /**
         * trim range using criteria, if provided.
         *
         * from is exclusive, while to is inclusive
         */
        isEmpty(from)
          ? createEvaluationId({ processId, timestamp: '' })
          : createEvaluationId({ processId, timestamp: from.timestamp, ordinate: from.ordinate, cron: from.cron }),
        isEmpty(to)
          ? createEvaluationId({ processId, timestamp: COLLATION_SEQUENCE_MAX_CHAR })
          : createEvaluationId({ processId, timestamp: to.timestamp, ordinate: to.ordinate || COLLATION_SEQUENCE_MAX_CHAR, cron: to.cron }),
        limit
      ]
    }
  }

  return ({ processId, from, to, onlyCron, sort, limit }) => {
    return of({ processId, from, to, onlyCron, sort: sort.toUpperCase(), limit })
      .map(createQuery)
      .chain(fromPromise((query) => db.query(query)))
      .map(map(fromEvaluationDoc))
      .toPromise()
  }
}

export function findMessageHashBeforeWith ({ db }) {
  function createQuery ({ deepHash, processId, timestamp, ordinate }) {
    return {
      sql: `
        SELECT
          id, processId, messageId, deepHash, nonce, epoch, timestamp,
          ordinate, blockHeight, cron, evaluatedAt, output
        FROM ${EVALUATIONS_TABLE}
        WHERE
          deepHash = ?
          AND id > ? AND id < ?
        LIMIT 1;
      `,
      parameters: [
        deepHash,
        /**
         * Since eval doc id are each lexicographically sortable, we can find an
         * prior evaluation, with matching deepHash, by comparing the ids.
         *
         * $gt processId ensures we only consider evaluations for the process
         * we are interested in
         */
        createEvaluationId({ processId, timestamp: '' }),
        /**
         * $lt because we are looking for any evaluation on this process,
         * PRIOR to this one with a matching deepHash
         */
        createEvaluationId({ processId, timestamp, ordinate })
      ]
    }
  }

  return ({ messageHash, processId, timestamp, ordinate }) =>
    of({ deepHash: messageHash, processId, timestamp, ordinate })
      .map(createQuery)
      .chain(fromPromise((query) => db.query(query)))
      .map(defaultTo([]))
      .map(head)
      .chain((row) => row ? Resolved(row) : Rejected({ status: 404, message: 'Evaluation result not found' }))
      .map(fromEvaluationDoc)
      .toPromise()
}
