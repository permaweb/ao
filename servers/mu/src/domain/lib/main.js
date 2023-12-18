import { of } from 'hyper-async'

import { getCuAddressWith } from './processDataItem/get-cu-address.js'
import { writeMessageTxWith } from './processDataItem/write-message-tx.js'
import { fetchAndSaveResultWith } from './processDataItem/fetch-and-save-result.js'
import { buildTxWith } from './processDataItem/build-tx.js'
import { crankWith } from './crank/crank.js'
import { spawnProcessWith } from './processSpawn/spawn-process.js'
import { sendSpawnSuccessWith } from './processSpawn/send-spawn-success.js'
import { buildSuccessTxWith } from './processSpawn/build-success-tx.js'
import { parseDataItemWith } from './processDataItem/parse-data-item.js'
import { saveWith } from './saveMonitor/save-process.js'
import { appendSequencerDataWith } from './saveMonitor/append-sequencer-data.js'
import { deleteMsgDataWith } from './processDataItem/delete-msg-data.js'
import { deleteSpawnDataWith } from './processSpawn/delete-spawn-data.js'
import { tracerFor } from './tracer.js'
import { verifyParsedDataItemWith } from './processDataItem/verify-parsed-data-item.js'
import { writeProcessTxWith } from './processDataItem/write-process-tx.js'

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
  fetchResult,
  saveMsg,
  saveSpawn,
  findLatestMsgs,
  findLatestSpawns,
  crank,
  logger
}) {
  const verifyParsedDataItem = verifyParsedDataItemWith()
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeTx = writeMessageTxWith({ writeDataItem, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  const writeProcess = writeProcessTxWith({ logger, writeDataItem })

  /**
   * If the data item is a Message, then cranking and tracing
   * must also be performed.
   */
  const sendMessage = (ctx) => of({ ...ctx, message: ctx.dataItem })
    .map(({ message, ...rest }) => ({
      ...rest,
      message,
      tracer: tracerFor({
        /**
         * The message being cranked is the start of the trace train
         */
        message,
        /**
         * Since this message was sent to the MU, it was not cranked by the MU,
         * and hence has no parent message
         */
        parent: null,
        /**
         * Since this message was sent to the MU, it was not cranked by the MU,
         * and hence is from the wallet that signed the message
         */
        from: message.owner
      })
    }))
    .chain(({ message, tracer, ...rest }) =>
      of({ ...rest, tracer })
        .chain(writeTx)
        .map(res => ({
          /**
           * An opaque method to fetch the result of the message just forwarded
           * and then crank its results
           */
          crank: () => of(res)
            .chain(getCuAddress)
            .chain(fetchAndSaveResult)
            .chain(({ msgs, spawns }) => crank({
              message,
              tracer,
              msgs,
              spawns
            }))
            .bimap(
              logger.tap('Failed to crank messages'),
              logger.tap('Successfully cranked messages')
            )
        }))
    )

  /**
   * Simply write the process to the SU
   * and return a noop crank
   */
  const sendProcess = (ctx) => of(ctx)
    .chain(writeProcess)
    .map(() => ({
      /**
       * There is nothing to crank for a process sent to the MU,
       *
       * so the crank method will simply noop, keeping the behavior
       * a black box
       */
      crank: () => of()
        .map(logger.tap('No cranking for a Process DataItem required. Nooping...'))
    }))

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain((ctx) =>
        verifyParsedDataItem(ctx.dataItem)
          .chain(({ isMessage }) => {
            if (isMessage) return sendMessage(ctx)
            return sendProcess(ctx)
          })
      )
  }
}

/**
 * process a single message and return its responses
 * the input to this is a cached cu result
 */
export function processMsgWith ({
  selectNode,
  writeDataItem,
  fetchResult,
  saveMsg,
  saveSpawn,
  buildAndSign,
  findLatestMsgs,
  findLatestSpawns,
  deleteMsg,
  logger
}) {
  const buildTx = buildTxWith({ buildAndSign, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeTx = writeMessageTxWith({ writeDataItem, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })
  const deleteMsgData = deleteMsgDataWith({ deleteMsg, logger })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain(writeTx)
      .chain(getCuAddress)
      .chain(fetchAndSaveResult)
      .chain(deleteMsgData)
  }
}

/**
 * process a spawn that comes from the cu result endpoint
 */
export function processSpawnWith ({
  logger,
  writeProcessTx,
  writeDataItem,
  buildAndSign,
  deleteSpawn
}) {
  const spawnProcess = spawnProcessWith({ logger, writeProcessTx })
  const buildSuccessTx = buildSuccessTxWith({ logger, buildAndSign })
  const sendSpawnSuccess = sendSpawnSuccessWith({ logger, writeDataItem })
  const deleteSpawnData = deleteSpawnDataWith({ logger, deleteSpawn })

  return (ctx) => {
    return of(ctx)
      .chain(spawnProcess)
      .chain(buildSuccessTx)
      .chain(sendSpawnSuccess)
      .chain(deleteSpawnData)
  }
}

/**
 * Accepts the result of an evaluation, and processes the outbox,
 * ie. the messages and spawns
 */
export function crankMsgsWith ({
  processMsg,
  processSpawn,
  saveMessageTrace,
  logger
}) {
  const crank = crankWith({ processMsg, processSpawn, saveMessageTrace, logger })

  return (ctx) => {
    return of(ctx)
      .chain(crank)
  }
}

export function monitorProcessWith ({
  logger,
  createDataItem,
  saveProcessToMonitor,
  fetchSequencerProcess
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const save = saveWith({ logger, saveProcessToMonitor })
  const appendSequencerData = appendSequencerDataWith({ logger, fetchSequencerProcess })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(appendSequencerData)
      .chain(save)
  }
}

export function traceMsgsWith ({ logger, findMessageTraces }) {
  const traceMsgs = traceMsgsWith({ logger, findMessageTraces })

  return (ctx) => {
    return of(ctx)
      .chain(traceMsgs)
  }
}
