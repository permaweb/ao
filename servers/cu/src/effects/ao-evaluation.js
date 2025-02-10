import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, isEmpty, isNotNil, converge, mergeAll, map, unapply, prop, head, defaultTo, evolve, pipe } from 'ramda'
import { z } from 'zod'

import { evaluationSchema } from '../domain/model.js'
import { EVALUATIONS_TABLE, MESSAGES_TABLE, COLLATION_SEQUENCE_MAX_CHAR } from './db.js'

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
  output: evaluationSchema.shape.output.omit({ Memory: true }).nullish() // This can now be nullish as the DB may not have the output
})

function createEvaluationId ({ processId, timestamp, ordinate, cron }) {
  return `${[processId, timestamp, ordinate, cron].filter(isNotNil).join(',')}`
}

/**
 * Each message evaluated by the CU must have a unique idenfier. Messages can be:
 * - an "end-user" message (signed by a "end-user" wallet)
 * - an assignment (either signed by an "end-user" wallet or pushed from a MU)
 * - a pushed message (from a MU)
 *
 * If the message is an assignment, then we know that its unique identifier
 * is always the messageId.
 *
 * Otherwise, we must check if a deepHash was calculated by the CU (ie. for a pushed message)
 * and use that as the unique identifier
 *
 * Finally, if it is not an assignment and also not pushed from a MU, then it MUST
 * be a "end-user" message, and therefore its unique identifier is, once again, the messageId
 */
function createMessageId ({ messageId, deepHash, isAssignment }) {
  if (isAssignment) return messageId
  return deepHash || messageId
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
    output: (old) => typeof old === 'string' ? JSON.parse(old) : old
  }),
  /**
   * Ensure the input matches the expected
   * shape
   */
  evaluationDocSchema.parse,
  toEvaluation
)

export function findEvaluationFromDirOrS3With ({ loadEvaluation }) {
  return ({ processId, messageId }) => {
    return Promise.resolve({ processId, messageId })
      .then(loadEvaluation)
      .catch((err) => {
        throw new Error(`Error finding evaluation from dir or s3: ${err}`)
      })
  }
}

export function findEvaluationFromDbWith ({ db }) {
  function createQuery ({ processId, timestamp, ordinate, cron }) {
    return {
      sql: `
        SELECT
          id, "processId", "messageId", "deepHash", nonce, epoch, timestamp,
          ordinate, "blockHeight", cron, "evaluatedAt", output
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

export function findEvaluationWith ({ db, loadEvaluation, EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET }) {
  const findEvaluationFromDir = findEvaluationFromDirOrS3With({ loadEvaluation })
  const findEvaluationFromDb = fromPromise(findEvaluationFromDbWith({ db }))
  return ({ processId, to, ordinate, cron, messageId }) => {
    return of({ processId, to, ordinate, cron, messageId })
      .chain(findEvaluationFromDb)
      .chain(
        fromPromise(async (result) => {
          if (EVALUATION_RESULT_DIR && EVALUATION_RESULT_BUCKET && !result.output) {
            const evaluationOutput = await findEvaluationFromDir({ processId, messageId })
            if (evaluationOutput == 'AWS Credentials not set') {
              return Rejected({ status: 404, message: 'Could not find evaluation: AWS Credentials not set' }).toPromise()
            }
            return { ...result, output: evaluationOutput }
          }
          return result
        })
      )
      .toPromise()
  }
}

export function saveEvaluationWith ({ DISABLE_PROCESS_EVALUATION_CACHE, db, logger: _logger, saveEvaluationToDir, EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET }) {
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

  const messageDocParamsSchema = z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1)
  ])

  function createQuery (evaluation) {
    const evalDoc = toEvaluationDoc(evaluation)
    const statements = []

    if (!DISABLE_PROCESS_EVALUATION_CACHE) {

      // If we have a directory and bucket, we need to save the evaluation to the directory, not sqlite
      if (EVALUATION_RESULT_DIR && EVALUATION_RESULT_BUCKET) {
        statements.push({
          sql: `
            INSERT OR IGNORE INTO ${EVALUATIONS_TABLE}
              (id, "processId", "messageId", "deepHash", nonce, epoch, timestamp, ordinate, "blockHeight", cron, "evaluatedAt")
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          parameters: [
            // evaluations insert
            evalDoc.id,
            evalDoc.processId,
            evalDoc.messageId,
            evalDoc.deepHash,
            evalDoc.nonce,
            evalDoc.epoch,
            evalDoc.timestamp,
            evalDoc.ordinate,
            evalDoc.blockHeight,
            evalDoc.cron,
            evalDoc.evaluatedAt.getTime()
          ]
        })
      } else {

        statements.push({
          sql: `
              INSERT OR IGNORE INTO ${EVALUATIONS_TABLE}
                (id, "processId", "messageId", "deepHash", nonce, epoch, timestamp, ordinate, "blockHeight", cron, "evaluatedAt", output)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `,
          parameters: [
            // evaluations insert
            evalDoc.id,
            evalDoc.processId,
            evalDoc.messageId,
            evalDoc.deepHash,
            evalDoc.nonce,
            evalDoc.epoch,
            evalDoc.timestamp,
            evalDoc.ordinate,
            evalDoc.blockHeight,
            evalDoc.cron,
            evalDoc.evaluatedAt.getTime(),
            JSON.stringify(evalDoc.output)
          ]
        })
      }
    }
    /**
      * Cron messages are not needed to be saved in the messages table
      */
    if (!evaluation.cron) {
      statements.push({
        sql: `
          INSERT OR IGNORE INTO ${MESSAGES_TABLE} (id, "processId", seq) VALUES (?, ?, ?);
         `,
        parameters: messageDocParamsSchema.parse([
          createMessageId({
            messageId: evaluation.messageId,
            deepHash: evaluation.deepHash,
            isAssignment: evaluation.isAssignment
          }),
          evaluation.processId,
          `${evaluation.epoch}:${evaluation.nonce}`
        ])
      })
    }

    return statements
  }

  return (evaluation) => {
    return of(evaluation)
      .chain((data) =>
        of(data)
          .map((data) => createQuery(data))
          .chain(fromPromise((statements) => {
            return db.transaction(statements)
          }))
          .map(always(data.id))
      )
      .chain((id) => {
        if (EVALUATION_RESULT_DIR && EVALUATION_RESULT_BUCKET) {
          return of({ messageId: evaluation.messageId, processId: evaluation.processId, output: evaluation.output })
            .chain((args) => {
              return Resolved(saveEvaluationToDir(args))
            })
        }
        return Resolved(id)
      })
      .toPromise()
  }
}

export function findEvaluationsWith ({ db, loadEvaluation, EVALUATION_RESULT_DIR, EVALUATION_RESULT_BUCKET }) {
  const findEvaluationFromDir = findEvaluationFromDirOrS3With({ loadEvaluation })
  function createQuery ({ processId, from, to, onlyCron, sort, limit }) {
    return {
      sql: `
        SELECT
          id, "processId", "messageId", "deepHash", nonce, epoch, timestamp,
          ordinate, "blockHeight", cron, "evaluatedAt", output
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
          : createEvaluationId({ processId, timestamp: to?.timestamp || null, ordinate: to?.ordinate || COLLATION_SEQUENCE_MAX_CHAR, cron: to?.cron || null }),
        limit
      ]
    }
  }

  return ({ processId, from, to, onlyCron, sort, limit }) => {
    return of({ processId, from, to, onlyCron, sort: sort.toUpperCase(), limit })
      .map(createQuery)
      .chain(fromPromise((query) => db.query(query)))
      .chain(fromPromise(async (results) => {
        if (EVALUATION_RESULT_DIR && EVALUATION_RESULT_BUCKET) {
          return await Promise.all(results.map(async (result) => {
            if (result.processId && result.messageId && !result.output) {
              const evaluationOutput = await findEvaluationFromDir({ processId: result.processId, messageId: result.messageId })
              if (evaluationOutput == 'AWS Credentials not set') {
                return Rejected({ status: 404, message: 'Could not find evaluation: AWS Credentials not set' })
              }
              return { ...result, output: evaluationOutput }
            }
            return result
          }))
        }
        return results
      }))
      .map(map(fromEvaluationDoc))
      .toPromise()
  }
}

export function findMessageBeforeWith ({ db }) {
  function createQuery ({ messageId, deepHash, isAssignment, processId, nonce, epoch }) {
    const sqliteQuery = `
      SELECT
        id, seq
      FROM ${MESSAGES_TABLE}
      WHERE
        id = ?
        AND processId = ?
        AND (
          CAST(substr(seq, instr(seq, ':') + 1) as UNSIGNED) < ?
          OR
            (
              CAST(SUBSTR(seq, 1, INSTR(seq, ':') - 1) AS INTEGER) = ?
              AND CAST(SUBSTR(seq, INSTR(seq, ':') + 1) AS INTEGER) < ?
            )
        )
      LIMIT 1;
    `

    const postgresQuery = `
      SELECT
        id, seq
      FROM ${MESSAGES_TABLE}
      WHERE
        "id" = ?
        AND "processId" = ?
        AND (
          CAST(SUBSTR(seq, POSITION(':' in seq) + 1) AS INTEGER) < ?
          OR
            (
              CAST(SUBSTR(seq, 1, POSITION(':' in seq) - 1) AS INTEGER) = ?
              AND CAST(SUBSTR(seq, POSITION(':' in seq) + 1) AS INTEGER) < ?
            )
        )
      LIMIT 1;
    `

    return {
      sql: db.engine === 'sqlite' ? sqliteQuery : postgresQuery,
      parameters: [
        createMessageId({ messageId, deepHash, isAssignment }),
        processId,
        epoch,
        epoch,
        nonce
      ]
    }
  }

  return (args) =>
    of(args)
      .map(createQuery)
      .chain(fromPromise((query) => db.query(query)))
      .map(defaultTo([]))
      .map(head)
      .chain((row) => row ? Resolved(row) : Rejected({ status: 404, message: 'Message Not Found' }))
      .map((row) => ({ id: row.id }))
      .toPromise()
}
