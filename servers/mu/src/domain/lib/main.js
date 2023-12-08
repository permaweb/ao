import { of } from 'hyper-async'

import { getCuAddressWith } from './processMsg/get-cu-address.js'
import { writeTxWith } from './processMsg/write-tx.js'
import { fetchAndSaveResultWith } from './processMsg/fetch-and-save-result.js'
import { buildTxWith } from './processMsg/build-tx.js'
import { crankWith } from './crank/crank.js'
import { spawnProcessWith } from './processSpawn/spawn-process.js'
import { sendSpawnSuccessWith } from './processSpawn/send-spawn-success.js'
import { buildSuccessTxWith } from './processSpawn/build-success-tx.js'
import { parseDataItemWith } from './processMsg/parse-data-item.js'
import { saveWith } from './saveMonitor/save-process.js'
import { appendSequencerDataWith } from './saveMonitor/append-sequencer-data.js'
import { deleteMsgDataWith } from './processMsg/delete-msg-data.js'
import { deleteSpawnDataWith } from './processSpawn/delete-spawn-data.js'
import { tracerFor } from './tracer.js'

export function sendMsgWith ({
  selectNode,
  createDataItem,
  writeSequencerTx,
  fetchResult,
  saveMsg,
  saveSpawn,
  findLatestMsgs,
  findLatestSpawns,
  crank,
  logger
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeTx = writeTxWith({ writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
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
          }))
      )
  }
}

/**
 * process a single message and return its responses
 * the input to this is a cached cu result
 */
export function processMsgWith ({
  selectNode,
  writeSequencerTx,
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
  const writeTx = writeTxWith({ writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })
  const deleteMsgData = deleteMsgDataWith({ deleteMsg, logger })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain(getCuAddress)
      .chain(writeTx)
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
  writeSequencerTx,
  buildAndSign,
  deleteSpawn
}) {
  const spawnProcess = spawnProcessWith({ logger, writeProcessTx })
  const buildSuccessTx = buildSuccessTxWith({ logger, buildAndSign })
  const sendSpawnSuccess = sendSpawnSuccessWith({ logger, writeSequencerTx })
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
