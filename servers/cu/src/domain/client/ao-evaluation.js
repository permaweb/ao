import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, isEmpty, isNotNil, converge, mergeAll, map, unapply, prop, head } from 'ramda'
import { z } from 'zod'

import { evaluationSchema } from '../model.js'
import { COLLATION_SEQUENCE_MAX_CHAR, CRON_EVALS_ASC_IDX, EVALS_ASC_IDX, EVALS_DEEPHASH_ASCENDING } from './pouchdb.js'
import { EVALUATIONS_TABLE } from './sqlite.js'

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

export function findEvaluationWith ({ pouchDb }) {
  return ({ processId, to, ordinate, cron }) => {
    return of({ processId, to, ordinate, cron })
      .chain(fromPromise(() => pouchDb.get(createEvaluationId({ processId, timestamp: to, ordinate, cron }))))
      .bichain(
        (err) => {
          if (err.status === 404) return Rejected({ status: 404, message: 'Evaluation result not found' })
          return Rejected(err)
        },
        (found) => of(found)
          /**
           * Ensure the input matches the expected
           * shape
           */
          .map(evaluationDocSchema.parse)
          .map(toEvaluation)
      )
      .toPromise()
  }
}

export function saveEvaluationWith ({ db, logger: _logger }) {
  const toEvaluationDoc = converge(
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
  )

  function createQuery (evaluation) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${EVALUATIONS_TABLE}
        (id, processId, messageId, deepHash, nonce, epoch, timestamp, ordinate, blockHeight, cron, evaluatedAt, output)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        evaluation.output
      ]
    }
  }

  return (evaluation) => {
    return of(evaluation)
      .map(toEvaluationDoc)
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(evaluationDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .map((doc) => createQuery(doc))
          .chain(fromPromise((query) => db.run(query)))
          .map(always(doc._id))
      )
      .toPromise()
  }
}

export function findEvaluationsWith ({ pouchDb }) {
  function createQuery ({ processId, from, to, onlyCron, sort, limit }) {
    const query = {
      selector: {
        _id: {
          $gt: createEvaluationId({ processId, timestamp: '' }),
          $lte: createEvaluationId({ processId, timestamp: COLLATION_SEQUENCE_MAX_CHAR })
        },
        ...(onlyCron ? { cron: { $exists: true } } : {})
      },
      limit,
      sort: [{ _id: sort }],
      use_index: onlyCron ? CRON_EVALS_ASC_IDX : EVALS_ASC_IDX
    }

    /**
     * trim range using criteria, if provided.
     *
     * from is exclusive, while to is inclusive
     */
    if (!isEmpty(from)) query.selector._id.$gt = `${createEvaluationId({ processId, timestamp: from.timestamp, ordinate: from.ordinate, cron: from.cron })}`
    if (!isEmpty(to)) query.selector._id.$lte = `${createEvaluationId({ processId, timestamp: to.timestamp, ordinate: to.ordinate, cron: to.cron })}`

    return query
  }

  return ({ processId, from, to, onlyCron, sort, limit }) => {
    return of({ processId, from, to, onlyCron, sort: sort.toLowerCase(), limit })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(map(toEvaluation))
      .toPromise()
  }
}

export function findMessageHashBeforeWith ({ pouchDb }) {
  function createQuery ({ deepHash, processId, timestamp, ordinate }) {
    const query = {
      selector: {
        /**
         * Since eval doc _id are each lexicographically sortable, we can find an
         * prior evaluation, with matching deepHash, by comparing the _ids
         */
        _id: {
          $gt: createEvaluationId({ processId, timestamp: '' }),
          /**
           * $lt because we are looking for any evaluation on this process,
           * PRIOR to this one with a matching deepHash
           */
          $lt: createEvaluationId({ processId, timestamp, ordinate })
        },
        deepHash
      },
      limit: 1,
      use_index: EVALS_DEEPHASH_ASCENDING
    }

    return query
  }

  return ({ messageHash, processId, timestamp, ordinate }) =>
    of({ deepHash: messageHash, processId, timestamp, ordinate })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(map(toEvaluation))
      .map(head)
      .chain((evaluation) => evaluation
        ? Resolved(evaluation)
        : Rejected({ status: 404, message: 'Evaluation result not found' })
      )
      .toPromise()
}
