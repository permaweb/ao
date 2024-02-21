import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, isEmpty, isNotNil, converge, mergeAll, map, unapply, prop, head } from 'ramda'
import { z } from 'zod'

import { evaluationSchema } from '../model.js'
import { COLLATION_SEQUENCE_MAX_CHAR, CRON_EVALS_ASC_IDX, EVALS_ASC_IDX, EVALS_DEEPHASH_ASCENDING } from './pouchdb.js'
import { createProcessId } from './ao-process.js'

const evaluationDocSchema = z.object({
  _id: z.string().min(1),
  processId: evaluationSchema.shape.processId,
  messageId: evaluationSchema.shape.messageId,
  deepHash: evaluationSchema.shape.deepHash,
  timestamp: evaluationSchema.shape.timestamp,
  nonce: evaluationSchema.shape.nonce,
  epoch: evaluationSchema.shape.epoch,
  ordinate: evaluationSchema.shape.ordinate,
  blockHeight: evaluationSchema.shape.blockHeight,
  cron: evaluationSchema.shape.cron,
  parent: z.string().min(1),
  evaluatedAt: evaluationSchema.shape.evaluatedAt,
  output: evaluationSchema.shape.output.omit({ Memory: true }),
  type: z.literal('evaluation')
})

function createEvaluationId ({ processId, timestamp, ordinate, cron }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `eval-${[processId, timestamp, ordinate, cron].filter(isNotNil).join(',')}`
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

export function findLatestEvaluationsWith ({ pouchDb }) {
  function createQuery ({ processId, to, ordinate, cron, limit }) {
    const query = {
      selector: {
        _id: {
          /**
           * find any evaluations for the process
           */
          $gte: createEvaluationId({ processId, timestamp: '' }),
          /**
           * up to the latest evaluation.
           *
           * By using the max collation sequence char, this will give us all evaluations
           * for the process, all the way up to the latest
           */
          $lte: createEvaluationId({ processId, timestamp: COLLATION_SEQUENCE_MAX_CHAR })
        }
      },
      /**
       * _ids for sequential evals are monotonically increasing
       * and lexicographically sortable
       *
       * so by sorting descending, the first document will also be the latest
       * in the evaluation stream
       */
      sort: [{ _id: 'desc' }],
      /**
       * Only get the latest document within the range,
       * aka the latest evaluation
       */
      limit,
      use_index: EVALS_ASC_IDX
    }

    /**
     * Criteria was provided, so overwrite upper range with actual upper range
     */
    if (to || ordinate || cron) {
      query.selector._id.$lte =
        `${createEvaluationId({ processId, timestamp: to, ordinate, cron })}${COLLATION_SEQUENCE_MAX_CHAR}`
    }

    return query
  }

  return ({ processId, to, ordinate, cron }) => {
    return of({ processId, to, ordinate, cron })
      .map(createQuery)
      .chain(fromPromise((query) => {
        return pouchDb.find(query)
          .then((res) => {
            if (res.warning) console.warn(res.warning)
            return res.docs
          })
      }))
      .map(map(toEvaluation))
      .toPromise()
  }
}

export function saveEvaluationWith ({ pouchDb, logger: _logger }) {
  return (evaluation) => {
    return of(evaluation)
      .map(
        converge(
          unapply(mergeAll),
          [
            toEvaluation,
            applySpec({
              /**
               * The processId concatenated with the timestamp, and possible the cron (if defined)
               * is used as the _id for an evaluation
               *
               * This makes it easier to query using a range query against the
               * primary index
               */
              _id: (evaluation) =>
                createEvaluationId({
                  processId: evaluation.processId,
                  timestamp: evaluation.timestamp,
                  ordinate: evaluation.ordinate,
                  /**
                   * By appending the cron identifier to the evaluation doc _id,
                   *
                   * this guarantees the document will have a unique, but sortable, _id
                   */
                  cron: evaluation.cron
                }),
              parent: (evaluation) => createProcessId({ processId: evaluation.processId }),
              type: always('evaluation')
            })
          ]
        )
      )
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(evaluationDocSchema.parse)
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
