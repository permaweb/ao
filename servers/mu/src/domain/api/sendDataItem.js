import { of, Rejected, fromPromise, Resolved } from 'hyper-async'
import { compose, head, identity, isEmpty, prop, propOr } from 'ramda'
import createKeccakHash from 'keccak'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { writeMessageTxWith } from '../lib/write-message-tx.js'
import { pullResultWith } from '../lib/pull-result.js'
import { parseDataItemWith } from '../lib/parse-data-item.js'
import { verifyParsedDataItemWith } from '../lib/verify-parsed-data-item.js'
import { writeProcessTxWith } from '../lib/write-process-tx.js'
import { locateProcessSchema } from '../dal.js'
import { MESSAGES_TABLE } from '../clients/sqlite.js'

/**
 * Forward along the DataItem to the SU,
 *
 * and conditionally crank based on whether the DataItem
 * is an ao Message or not
 */
export function sendDataItemWith ({
  selectNode,
  createDataItem,
  writeDataItem,
  locateScheduler,
  locateProcess,
  fetchResult,
  fetchHyperBeamResult,
  crank,
  isHyperBeamProcess,
  logger,
  fetchSchedulerProcess,
  writeDataItemArweave,
  spawnPushEnabled,
  db,
  getRecentTraces,
  toAddress,
  getRateLimits,
  IP_WALLET_RATE_LIMIT,
  IP_WALLET_RATE_LIMIT_INTERVAL,
  GET_RESULT_MAX_RETRIES,
  GET_RESULT_RETRY_DELAY,
  ENABLE_MESSAGE_RECOVERY,
  fetchHBProcesses,
  fetchProcessWhitelist
}) {
  const verifyParsedDataItem = verifyParsedDataItemWith()
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ locateProcess, writeDataItem, logger, fetchSchedulerProcess, writeDataItemArweave })
  const pullResult = pullResultWith({ fetchResult, fetchHyperBeamResult, logger, fetchHBProcesses })
  const writeProcess = writeProcessTxWith({ locateScheduler, writeDataItem, logger })
  const getResult = getResultWith({ selectNode, fetchResult, logger, GET_RESULT_MAX_RETRIES, GET_RESULT_RETRY_DELAY })
  const insertMessage = insertMessageWith({ db })

  const locateProcessLocal = fromPromise(locateProcessSchema.implement(locateProcess))
  function keyToEthereumAddress (key) {
    /**
     * We need to decode, then remove the first byte denoting compression in secp256k1
     */
    const noCompressionByte = Buffer.from(key, 'base64url').subarray(1)

    /**
     * the un-prefixed address is the last 20 bytes of the hashed
     * public key
     */
    const noPrefix = createKeccakHash('keccak256')
      .update(noCompressionByte)
      .digest('hex')
      .slice(-40)

    /**
     * Apply the checksum see https://eips.ethereum.org/EIPS/eip-55
     */
    const hash = createKeccakHash('keccak256')
      .update(noPrefix)
      .digest('hex')

    let checksumAddress = '0x'
    for (let i = 0; i < noPrefix.length; i++) {
      checksumAddress += parseInt(hash[i], 16) >= 8
        ? noPrefix[i].toUpperCase()
        : noPrefix[i]
    }

    return checksumAddress
  }

  /**
   * Check if the rate limit has been exceeded using rate limit injected
   */
  async function checkRateLimitExceeded (ctx) {
    function calculateRateLimit (walletID, procID, limits) {
      if (!limits || Object.keys(limits).length === 0) return 10
      const userBase = Number(limits?.addresses?.[walletID] ?? 0) + Number(limits.default)
      const processLimits = limits?.processes?.[procID] ?? {}

      const processDivisor = Number(processLimits?.divide ?? 1)
      const processSubtractor = Number(processLimits?.subtract ?? 0)
      return Math.max(0, (userBase / processDivisor) - processSubtractor)
    }
    const rateLimits = getRateLimits()
    const isWhitelisted = (rateLimits?.ips?.[ctx.ip] ?? 0) > 1
    if (isWhitelisted) return Resolved(ctx)
    const intervalStart = new Date().getTime() - IP_WALLET_RATE_LIMIT_INTERVAL
    const wallet = ctx.dataItem.owner
    let address = await toAddress(wallet) || null
    if (ctx.dataItem.signature.length === 87) {
      address = keyToEthereumAddress(ctx.dataItem.owner)
    }
    const rateLimitAllowance = calculateRateLimit(address, ctx.dataItem.target ?? 'SPAWN', rateLimits)
    const recentTraces = await getRecentTraces({ wallet, timestamp: intervalStart, processId: ctx.dataItem.target })
    const walletTracesCount = recentTraces.wallet.length
    console.log(`Rate limit result for address ${address}, ${walletTracesCount} wallet traces found, ${rateLimitAllowance} rate limit allowance`)
    if (walletTracesCount >= rateLimitAllowance) {
      logger({ log: `Rate limit exceeded for wallet, ${recentTraces.wallet.length} wallet traces found. Rejecting.` })
      const error = new Error('Rate limit exceeded')
      error.code = 429
      throw error
    }
    return Resolved(ctx)
  }
  /**
     * If the data item is a Message, then cranking and tracing
     * must also be performed.
     */
  const sendMessage = (ctx) => of({ ...ctx, message: ctx.dataItem })
    .chain(fromPromise(async (ctx) => {
      const isHyperBeam = await isHyperBeamProcess(ctx.dataItem.target, ctx.logId)
      return { ...ctx, schedulerType: isHyperBeam ? 'hyperbeam' : 'legacy' }
    }))
    .map(logger.tap({ log: 'Sending message...' }))
    .map(({ message, ...rest }) => ({
      ...rest,
      message
    }))
    .chain(({ message, ...rest }) =>
      of({ ...rest })
        .chain(writeMessage)
        .bichain(
          (error) => {
            return of(error)
              .map(() => logger({ log: `Initial message failed: ${message.id} with error` }, ctx))
              .chain(() => Rejected(error))
          },
          (res) => Resolved(res)
        )
        .map(res => {
          if (!ENABLE_MESSAGE_RECOVERY) {
            return {
              ...res,
              crank: () => of({ ...res, initialTxId: res.tx.id })
                .chain(getCuAddress)
                .chain(pullResult)
                .chain((ctx) => {
                  const { msgs, spawns, assigns, initialTxId, messageId: parentId } = ctx
                  return crank({
                    msgs,
                    spawns,
                    assigns,
                    initialTxId,
                    parentId,
                    ip: ctx.ip,
                    parentOwner: ctx.dataItem?.owner
                  })
                })
                .bimap(
                  (res) => {
                    logger({ log: 'Failed to push messages', end: true }, ctx)
                    return res
                  },
                  (res) => {
                    logger({ log: 'Pushing complete', end: true }, ctx)
                    return res
                  }
                )
            }
          }

          return {
            ...res,
            /**
               * An opaque method to fetch the result of the message just forwarded
               * and then crank its results
               */
            crank: () => {
              return of({ ...res, initialTxId: res.tx.id, pullResultAttempts: 0 })
                .chain(fromPromise(getResult))
                .bichain(
                  (error) => {
                    return of(error)
                      .map(() => logger({ log: 'Failed to get result of message, adding to message recovery database...', end: true }, res))
                      .chain(() => fromPromise(insertMessage)(res))
                      .chain(() => Rejected(error))
                  },
                  (ctx) => {
                    const { msgs, spawns, assigns, initialTxId, messageId: parentId } = ctx
                    return crank({
                      msgs,
                      spawns,
                      assigns,
                      initialTxId,
                      parentId,
                      ip: ctx.ip
                    })
                  })
                .bimap(
                  (res) => {
                    logger({ log: 'Failed to push messages', end: true }, ctx)
                    return res
                  },
                  (res) => {
                    logger({ log: 'Pushing complete', end: true }, ctx)
                    return res
                  }
                )
            }
          }
        }
        ))

  /**
   * If the Data Item is a Process, we push an Assignment
   * if the target is present. And as per aop6 Boot Loader
   * a result is also pulled from the CU for the process id.
   *
   * see https://github.com/permaweb/ao/issues/730
   */
  const sendProcess = (ctx) => of(ctx)
    .map(logger.tap({ log: 'Sending process...' }))
    .chain(writeProcess)
    .map((res) => ({
      ...res,
      /**
       * If there is a Target tag on the spawn, push an Assignment.
       * In all cases for new processes, a result will be called on the
       * CU for the process id itself, in order to trigger an initial
       * boot loader evaluation.
       */
      crank: () => of({ res })
        .chain(({ res }) => {
          if (!spawnPushEnabled) {
            return Resolved({
              ...res,
              msgs: [],
              spawns: [],
              assigns: [],
              initialTxId: res.initialTxId
            })
          }
          /**
           * Override the processId fields of tx and res, because parse-data-item sets it
           * to the target, but on a spawn we want it to be the id of the Data Item
           *
           * This is so getCuAddress and pullResult both operate properly.
           */
          return of({ ...res, tx: { ...res.tx, processId: res.tx.id }, processId: res.tx.id, initialTxId: res.tx.id })
            .chain(getCuAddress)
            .chain(pullResult)
        })
        .chain((res) => {
          const hasTarget = Boolean(res.dataItem.target)
          if (hasTarget) {
            return Rejected({ res })
          }
          return Resolved({ res })
        })
        .bichain(
          ({ res }) => {
            /**
             * If there is a target add this assignment
             */
            const assigns = [
              { Message: res.dataItem.id, Processes: [res.dataItem.target] },
              ...res.assigns
            ]
            return crank({
              msgs: res.msgs,
              spawns: res.spawns,
              assigns,
              initialTxId: res.tx.id,
              ip: res.ip
            })
          },
          ({ res }) => {
            /**
             * If no target just push the result of the boot loader
             * result call
             */
            return crank({
              msgs: res.msgs,
              spawns: res.spawns,
              assigns: res.assigns,
              initialTxId: res.tx.id,
              ip: res.ip
            })
          }
        )
        .bimap(
          (res) => {
            logger({ log: 'Assignments pushed for Process DataItem.', end: true }, ctx)
            return res
          },
          (res) => {
            logger({ log: 'No pushing an Assignment for a Process DataItem without target required.', end: true }, ctx)
            return res
          }
        )
    }))

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain((ctx) =>
        verifyParsedDataItem(ctx.dataItem)
          .map(logger.tap({ log: 'Successfully verified parsed data item', logId: ctx.logId }))
          .chain(({ isMessage }) => {
            return of(ctx)
              .chain(fromPromise(async () => await checkRateLimitExceeded(ctx)))
              .map(() => ({ isMessage }))
          })
          .chain(({ isMessage }) => {
            if (isMessage) {
              const whitelist = fetchProcessWhitelist ? fetchProcessWhitelist() : {}
              if (whitelist && Object.keys(whitelist).length > 0 && !whitelist[ctx.dataItem.target]) {
                const error = new Error('Forbidden, process not whitelisted')
                error.code = 403
                return Rejected(error)
              }
              /*
                  add schedLocation into the context if the
                  target is a process. if its a wallet dont add
                  schedLocation and it will get sent directly to
                  Arweave
              */
              return locateProcessLocal(ctx.dataItem.target)
                .map(logger.tap({ log: 'Successfully located process scheduler', logId: ctx.logId }))
                .chain((schedLocation) => sendMessage({ ...ctx, schedLocation }))
            }
            const variant = ctx.dataItem.tags.find(tag => tag.name === 'Variant')?.value
            const schedulerType = variant === 'ao.N.1' ? 'hyperbeam' : 'legacy'
            return sendProcess({ ...ctx, schedulerType })
          })
          .bimap(
            (e) => new Error(e, { cause: ctx }),
            identity
          )
      )
  }
}

function insertMessageWith ({ db }) {
  return async (ctx) => {
    const query = {
      sql: `
        INSERT OR IGNORE INTO ${MESSAGES_TABLE} (
          id,
          timestamp,
          data,
          retries
        ) VALUES (?, ?, ?, 0)
      `,
      parameters: [ctx.logId, new Date().getTime(), JSON.stringify(ctx)]
    }
    return await db.run(query).then(() => ctx)
  }
}

function getResultWith ({ selectNode, fetchResult, logger, GET_RESULT_MAX_RETRIES, GET_RESULT_RETRY_DELAY }) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const pullResult = pullResultWith({ fetchResult, logger })
  /**
   * Attempt to get the result of the message from the CU
   * If it fails, retry recursively up to GET_RESULT_MAX_RETRIES times
   * with a delay of GET_RESULT_RETRY_DELAY * (2 ** attempts)
   */
  return async function getResult (ctx) {
    const attempts = ctx.pullResultAttempts
    return of(ctx)
      .chain(getCuAddress)
      .chain(pullResult)
      .bichain(
        fromPromise(async (_err) => {
          logger({ log: `Error pulling result on attempt ${attempts} / ${GET_RESULT_MAX_RETRIES}, attempting to retry...` }, ctx)
          if (attempts < GET_RESULT_MAX_RETRIES) {
            // Increment the retry count
            ctx.pullResultAttempts++

            // Delay the retry by GET_RESULT_RETRY_DELAY * (2 ** attempts)
            await new Promise(resolve => setTimeout(resolve, GET_RESULT_RETRY_DELAY * (2 ** attempts)))

            // Recursively retry the getResult function
            return await getResult(ctx)
          }
          // If we've reached the max retries, throw an error
          throw new Error(`GetResult ran out of retries (${GET_RESULT_MAX_RETRIES}). Bubbling error...`, { cause: ctx })
        }),
        // If the result is successful, return it as Resolved
        Resolved
      )
      .toPromise()
  }
}

function selectMessageWith ({ db }) {
  /**
   * selectMessage
   * Selects the oldest message from the database
   *
   * @returns The oldest message from the database
   */
  return async () => {
    const timestamp = new Date().getTime()
    const query = {
      sql: `SELECT * FROM ${MESSAGES_TABLE} WHERE timestamp < ? ORDER BY timestamp ASC LIMIT 1`,
      parameters: [timestamp]
    }
    return await db.query(query)
  }
}

function deleteMessageWith ({ db }) {
  /**
   * deleteMessage
   * Deletes a message from the database
   *
   * @param logId - The logId of the message to delete
   * @returns The logId of the deleted message
   */
  return async (logId) => {
    const query = {
      sql: `
        DELETE FROM ${MESSAGES_TABLE}
        WHERE id = ?
      `,
      parameters: [logId]
    }

    return await db.run(query).then(() => logId)
  }
}

function updateMessageTimestampWith ({ db, logger, MESSAGE_RECOVERY_MAX_RETRIES, MESSAGE_RECOVERY_RETRY_DELAY }) {
  /**
   * updateMessageTimestamp
   * If a message is out of retries, deletes it.
   * Else, updates the timestamp and retries of a message in the database.
   * The timestamp is updated to the current time plus the retry delay.
   * This stops it from being selected again until the delay is over.
   *
   * @param logId - The logId of the message to update
   * @param retries - The number of retries the message has had
   * @returns The logId of the updated message
   */
  return async (logId, retries) => {
    const deleteQuery = {
      sql: `DELETE FROM ${MESSAGES_TABLE} WHERE id = ?`,
      parameters: [logId]
    }
    const updateOffset = MESSAGE_RECOVERY_RETRY_DELAY * (2 ** retries)
    const updateQuery = {
      sql: `UPDATE OR IGNORE ${MESSAGES_TABLE} SET timestamp = ?, retries = retries + 1 WHERE id = ?`,
      parameters: [new Date().getTime() + updateOffset, logId]
    }
    // Set the query to the update query
    let query = updateQuery
    // If the message has ran out of retries, run the delete query
    if (retries > MESSAGE_RECOVERY_MAX_RETRIES) {
      query = deleteQuery
      logger({ log: `Message with logId ${logId} has ran out of retries and been deleted`, end: true }, { logId })
    }

    return await db.run(query).then(() => logId)
  }
}

export function startMessageRecoveryCronWith ({ selectNode, fetchResult, logger, db, cron, crank, GET_RESULT_MAX_RETRIES, GET_RESULT_RETRY_DELAY, MESSAGE_RECOVERY_MAX_RETRIES, MESSAGE_RECOVERY_RETRY_DELAY, ENABLE_MESSAGE_RECOVERY }) {
  const getResult = getResultWith({ selectNode, fetchResult, logger, GET_RESULT_MAX_RETRIES, GET_RESULT_RETRY_DELAY })
  const selectMessage = selectMessageWith({ db })
  const deleteMessage = deleteMessageWith({ db })
  const updateMessageTimestamp = updateMessageTimestampWith({ db, logger, MESSAGE_RECOVERY_MAX_RETRIES, MESSAGE_RECOVERY_RETRY_DELAY })

  /**
   * startMessageRecoveryCron
   * Starts the message recovery cron job.
   * Every 10 seconds, it will attempt to recover a message.
   * If it fails, it will retry the message up to MESSAGE_RECOVERY_MAX_RETRIES times
   * with a delay of MESSAGE_RECOVERY_RETRY_DELAY * (2 ** attempts).
   *
   * If the message is successfully recovered, it will be deleted from the database.
   */
  return async () => {
    if (!ENABLE_MESSAGE_RECOVERY) {
      logger({ log: 'Message recovery is disabled, not starting cron', end: true })
      throw new Error('Message recovery is disabled')
    }
    let ct = null
    let isJobRunning = false
    ct = cron.schedule('*/10 * * * * *', async () => {
      if (!isJobRunning) {
        isJobRunning = true
        ct.stop() // pause cron while recovering messages

        // Select the oldest message from the database
        await selectMessage()
          // Parse the message from the database
          .then((res) => ({ ctx: compose(JSON.parse, propOr('{}', 'data'), head)(res), retries: compose(prop('retries'), head)(res) }))
          .then(({ ctx, retries }) => {
            // If the message is empty (there is no message in the db), return
            if (isEmpty(ctx)) {
              isJobRunning = false
              return
            }
            const logId = ctx.logId
            logger({ log: `Attempting to recover message, retry ${retries} of ${MESSAGE_RECOVERY_MAX_RETRIES}` }, { logId })

            ctx.pullResultAttempts = 0
            // Attempt the result of the message from the CU
            return getResult(ctx)
              .then((res) => {
                const { msgs, spawns, assigns, messageId: parentId } = res
                // Push the results of the message to the crank function
                return crank({
                  msgs,
                  spawns,
                  assigns,
                  initialTxId: ctx.tx.id,
                  parentId
                }).toPromise()
              })
              .then(() => {
                // If the message is successfully recovered, delete it from the database
                logger({ log: 'Successfully recovered and pushed message results', end: true }, { logId })
                return deleteMessage(logId)
              })
              .then(() => {
                isJobRunning = false
              })
              .catch((e) => {
                // If the message is not successfully recovered, update the message timestamp and retry
                const delay = MESSAGE_RECOVERY_RETRY_DELAY * (2 ** retries)
                logger({ log: `Error recovering message - getResult, retrying in ${delay}ms: ${e}` }, ctx)
                updateMessageTimestamp(logId, retries)
                isJobRunning = false
              })
          })
          .catch((e) => {
            logger({ log: `Error recovering message - selectMessage: ${e}` })
            isJobRunning = false
          })

        ct.start() // resume cron when done recovering messages
      }
    })
  }
}
