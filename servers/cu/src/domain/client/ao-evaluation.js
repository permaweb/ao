import { fromPromise, of, Rejected } from 'hyper-async'
import { always, applySpec, identity, isEmpty, isNotNil, map, omit, pipe, prop } from 'ramda'
import { z } from 'zod'

import { evaluationSchema } from '../model.js'
import { COLLATION_SEQUENCE_MAX_CHAR, CRON_EVALS_ASC_IDX, EVALS_ASC_IDX } from './pouchdb.js'
import { createProcessId } from './ao-process.js'

const evaluationDocSchema = z.object({
  _id: z.string().min(1),
  processId: evaluationSchema.shape.processId,
  messageId: evaluationSchema.shape.messageId,
  timestamp: evaluationSchema.shape.timestamp,
  ordinate: evaluationSchema.shape.ordinate,
  blockHeight: evaluationSchema.shape.blockHeight,
  cron: evaluationSchema.shape.cron,
  parent: z.string().min(1),
  evaluatedAt: evaluationSchema.shape.evaluatedAt,
  output: evaluationSchema.shape.output,
  type: z.literal('evaluation')
})

const messageHashDocSchema = z.object({
  _id: z.string().min(1),
  /**
   * The _id of the corresponding cached evaluation
   */
  parent: z.string().min(1),
  type: z.literal('messageHash')
})

function createEvaluationId ({ processId, timestamp, ordinate, cron }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `eval-${[processId, timestamp, ordinate, cron].filter(isNotNil).join(',')}`
}

function createMessageHashId ({ messageHash }) {
  /**
   * transactions can sometimes start with an underscore,
   * which is not allowed in PouchDB, so prepend to create
   * an _id
   */
  return `messageHash-${messageHash}`
}

const toEvaluation = applySpec({
  processId: prop('processId'),
  messageId: prop('messageId'),
  timestamp: prop('timestamp'),
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
  const logger = _logger.child('ao-evaluation:saveEvaluation')

  const saveEvaluationInputSchema = z.object({
    _id: z.string().min(1),
    deepHash: z.string().nullish(),
    processId: evaluationSchema.shape.processId,
    messageId: evaluationSchema.shape.messageId,
    timestamp: evaluationSchema.shape.timestamp,
    ordinate: evaluationSchema.shape.ordinate,
    blockHeight: evaluationSchema.shape.blockHeight,
    cron: evaluationSchema.shape.cron,
    parent: z.string().min(1),
    evaluatedAt: evaluationSchema.shape.evaluatedAt,
    /**
     * Omit buffer from the document schema (see _attachments below)
     */
    output: evaluationSchema.shape.output.omit({ Memory: true }),
    type: z.literal('evaluation')
  })

  return (evaluation) => {
    return of(evaluation)
      .chain(fromPromise(async (evaluation) =>
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
          processId: prop('processId'),
          messageId: prop('messageId'),
          timestamp: prop('timestamp'),
          ordinate: prop('ordinate'),
          blockHeight: prop('blockHeight'),
          cron: prop('cron'),
          parent: (evaluation) => createProcessId({ processId: evaluation.processId }),
          output: pipe(
            prop('output'),
            /**
             * Make sure to omit the buffer from the output field
             * on the document.
             */
            omit(['Memory'])
          ),
          evaluatedAt: prop('evaluatedAt'),
          type: always('evaluation')
        })(evaluation)
      ))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(saveEvaluationInputSchema.parse)
      .map((evaluationDoc) => {
        if (!evaluation.deepHash) return [evaluationDoc]

        logger('Creating messageHash doc for deepHash "%s"', evaluation.deepHash)
        /**
         * Create an messageHash doc that we can later query
         * to prevent duplicate evals from duplicate cranks
         */
        return [
          evaluationDoc,
          messageHashDocSchema.parse({
            _id: createMessageHashId({ messageHash: evaluation.deepHash }),
            parent: evaluationDoc._id,
            type: 'messageHash'
          })
        ]
      })
      .chain(docs =>
        of(docs)
          .chain(fromPromise(docs => pouchDb.bulkDocs(docs)))
          .bimap(
            logger.tap('Encountered an error when caching evaluation docs'),
            identity
          )

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

export function findMessageHashWith ({ pouchDb }) {
  return ({ messageHash }) => of(messageHash)
    .chain(fromPromise((hash) => pouchDb.get(createMessageHashId({ messageHash: hash }))))
    .bichain(
      (err) => {
        if (err.status === 404) return Rejected({ status: 404, message: 'Message hash not found' })
        return Rejected(err)
      },
      (found) => of(found)
        .map(messageHashDocSchema.parse)
    )
    .toPromise()
}
