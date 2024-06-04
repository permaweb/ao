import { Duplex } from 'node:stream'

import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, isEmpty, isNotNil, converge, mergeAll, map, unapply, prop, head, defaultTo, evolve, pipe } from 'ramda'
import { z } from 'zod'
import { evaluationSchema } from '../model.js'
import { EVALUATIONS_TABLE, MESSAGES_TABLE, COLLATION_SEQUENCE_MAX_CHAR } from './sqlite.js'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { closeSync, createReadStream, createWriteStream, openSync } from 'node:fs'

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

  const messageDocParamsSchema = z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1)
  ])

  function createQuery (evaluation) {
    const evalDoc = toEvaluationDoc(evaluation)
    const statements = [
      {
        sql: `
          INSERT OR IGNORE INTO ${EVALUATIONS_TABLE}
            (id, processId, messageId, deepHash, nonce, epoch, timestamp, ordinate, blockHeight, cron, evaluatedAt, output)
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
      }
    ]

    /**
      * Cron messages are not needed to be saved in the messages table
      */
    if (!evaluation.cron) {
      statements.push({
        sql: `
          INSERT OR IGNORE INTO ${MESSAGES_TABLE} (id, processId, seq) VALUES (?, ?, ?);
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
          .chain(fromPromise((statements) => db.transaction(statements)))
          .map(always(data.id))
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

export function findMessageBeforeWith ({ db }) {
  function createQuery ({ messageId, deepHash, isAssignment, processId, nonce, epoch }) {
    return {
      sql: `
        SELECT
          id, seq
        FROM ${MESSAGES_TABLE}
        WHERE
          id = ?
          AND processId = ?
          AND seq < ?
        LIMIT 1;
      `,
      parameters: [
        createMessageId({ messageId, deepHash, isAssignment }),
        processId,
        `${epoch}:${nonce}` // 0:13
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

// Cron Messages Between

export const toSeconds = (millis) => Math.floor(millis / 1000)

/**
 * Whether the block height, relative to the origin block height,
 * matches the provided cron
 */
export function isBlockOnCron ({ height, originHeight, cron }) {
  /**
   * Don't count the origin height as a match
   */
  if (height === originHeight) return false

  return (height - originHeight) % cron.value === 0
}

/**
 * Whether the timstamp, relative to the origin timestamp,
 * matches the provided cron
 */
export function isTimestampOnCron ({ timestamp, originTimestamp, cron }) {
  /**
   * The smallest unit of time a cron can be placed is in seconds,
   * and if we modulo milliseconds, it can return 0 for fractional overlaps
   * of the scedule
   *
   * So convert the times to seconds perform applying modulo
   */
  timestamp = toSeconds(timestamp)
  originTimestamp = toSeconds(originTimestamp)
  /**
   * don't count the origin timestamp as a match
   */
  if (timestamp === originTimestamp) return false
  return (timestamp - originTimestamp) % cron.value === 0
}

export function cronMessagesBetweenWith ({ generateCronMessagesBetween }) {
  return ({
    processId,
    owner: processOwner,
    tags: processTags,
    moduleId,
    moduleOwner,
    moduleTags,
    originBlock,
    crons,
    blocksMeta
  }) => {
    // Instantiate Duplex
    const cronStream = new (class extends Duplex {
      constructor (options) {
        super({ objectMode: true, allowHalfOpen: true, emitClose: false, ...options })
        this.fileBuffer = join(tmpdir(), `cronMessages-${Date.now()}.txt`)
        closeSync(openSync(this.fileBuffer, 'w'))
        this.readStream = createReadStream(this.fileBuffer)
        this.writeStream = createWriteStream(this.fileBuffer)
        // this.writePromise = new Promise.resolve()
        // this.rl = null
      }

      async _write (cronMessage, encoding, callback) {
        this.push(cronMessage)
        callback()
        // console.log('Writing...', { cronMessage, encoding, callback, ws: this.writeStream })
        // // either buffer into memory up to x objects
        // // OR write to a file
        // // if (!this.writeStream) {
        // //   console.log('Creating write stream...')
        // //   this.writeStream = createWriteStream(this.fileBuffer)
        // // }

        // if (this.writeStream) {
        //   console.log('Writing to write stream...', { cronMessage })
        //   const res = this.writeStream.write(JSON.stringify(cronMessage) + '\n', encoding, callback)
        //   console.log('Wrote...', { res })
        //   console.log('promise', { p: this.writePromise })
        //   Promise.resolve(this.writePromise)
        // } else {
        //   console.log('No write stream!')
        // }
      }

      async _read () {
        // console.log('Reading...', { readable: this.readStream.readable, rb: this.readable })
        // await this.writePromise.then(() => {
        //   console.log("Promise resolved...")
        //   this.readStream.on('data', (chunk) => {
        //     console.log('LINE: ', { chunk })
        //     this.push(chunk)
        //   })

        //   this.readStream.on('end', () => {
        //     setTimeout(() => {
        //       console.log('ending...')
        //       this.read()
        //     }, 1000)
        //   })
        // })
        // if (!this.rl) {
        //   console.log('Creating rl interface...')
        //   this.rl = readline.createInterface({
        //     input: this.readStream,
        //     output: stdout,
        //     terminal: false
        //   })
        // }

        // this.rl.on('close', () => {
        //   console.log('On close...', { wf: this.writableFinished })
        //   if (!this.writableFinished) {
        //     setTimeout(() => {
        //       this.read()
        //     }, 1000)
        //   } else {
        //     console.log('Here4')
        //     this.push(null)
        //   }
        // })
      }

      _final () {
        console.log('Final')
        // if (this.writableFinished) {
        //   this.readStream.close()
        //   this.rl.close()
        //   this.writeStream.close()
        // }
      }
    })()

    return (left, right) => {
      generateCronMessagesBetween([{
        processId,
        owner: processOwner,
        tags: processTags,
        moduleId,
        moduleOwner,
        moduleTags,
        originBlock,
        crons,
        blocksMeta,
        left,
        right
        // maybe respect backpressure here
        // On: (payload) => write to stream
      }], async (cronMessage) => {
        console.log('Writing to cronstream...', { cronMessage })
        return cronStream.write(cronMessage, 'utf8', (err) => console.log('err: ', err))
      })
      // .then(() => {
      // console.log('Ending cronstream...')
      // cronStream.end()
      // })

      // Ideally return just the Readable from the Duplex
      return cronStream
    }
  }
}
