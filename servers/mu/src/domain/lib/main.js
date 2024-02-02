import { of, Rejected, fromPromise, Resolved } from 'hyper-async'

import { getCuAddressWith } from './processDataItem/get-cu-address.js'
import { writeMessageTxWith } from './processDataItem/write-message-tx.js'
import { fetchAndSaveResultWith } from './processDataItem/fetch-and-save-result.js'
import { buildTxWith } from './processDataItem/build-tx.js'
import { crankWith } from './crank/crank.js'
import { spawnProcessWith } from './processSpawn/spawn-process.js'
import { sendSpawnSuccessWith } from './processSpawn/send-spawn-success.js'
import { buildSuccessTxWith } from './processSpawn/build-success-tx.js'
import { parseDataItemWith } from './processDataItem/parse-data-item.js'
import { startWith } from './monitor/start-process.js'
import { stopWith } from './monitor/stop-process.js'
import { deleteMsgDataWith } from './processDataItem/delete-msg-data.js'
import { deleteSpawnDataWith } from './processSpawn/delete-spawn-data.js'
import { tracerFor } from './tracer.js'
import { verifyParsedDataItemWith } from './processDataItem/verify-parsed-data-item.js'
import { writeProcessTxWith } from './processDataItem/write-process-tx.js'
import { loadTracesWith } from './traceMsgs/load-traces.js'
import { errFrom } from '../utils.js'

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
  saveMsg,
  saveSpawn,
  findLatestMsgs,
  findLatestSpawns,
  crank,
  logger,
  saveMessageTrace
}) {
  const verifyParsedDataItem = verifyParsedDataItemWith()
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ locateProcess, writeDataItem, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  const writeProcess = writeProcessTxWith({ locateScheduler, writeDataItem, logger })

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
        parent: undefined,
        /**
         * Since this message was sent to the MU, it was not cranked by the MU,
         * and hence is from the wallet that signed the message
         */
        from: message.owner
      })
    }))
    .chain(({ message, tracer, ...rest }) =>
      of({ ...rest, tracer })
        .chain(writeMessage)
        .bichain(
          (error) => {
            return of(error)
              .map((e) => {
                tracer.trace(errFrom(e).stack)
                return tracer
              })
              .map((trc) => trc.unwrap())
              .map(logger.tap('Initial message failed %s', message.id))
              .chain(fromPromise(saveMessageTrace))
              .chain(() => Rejected(error))
          },
          (res) => Resolved(res)
        )
        .map(res => ({
          ...res,
          /**
           * An opaque method to fetch the result of the message just forwarded
           * and then crank its results
           */
          crank: () => of({ ...res, initialTxId: res.tx.id })
            .chain(getCuAddress)
            .chain(fetchAndSaveResult)
            .chain(({ msgs, spawns, initialTxId }) => crank({
              message,
              tracer,
              msgs,
              spawns,
              initialTxId
            }))
            .bimap(
              logger.tap('Failed to crank messages'),
              logger.tap('Cranking complete')
            )
        }))
    )

  /**
   * Simply write the process to the SU
   * and return a noop crank
   */
  const sendProcess = (ctx) => of(ctx)
    .chain(writeProcess)
    .map((res) => ({
      ...res,
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
  locateProcess,
  selectNode,
  writeDataItem,
  fetchResult,
  saveMsg,
  saveSpawn,
  buildAndSign,
  findLatestMsgs,
  findLatestSpawns,
  deleteMsg,
  logger,
  writeDataItemArweave
}) {
  const buildTx = buildTxWith({ buildAndSign, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ writeDataItem, locateProcess, logger, writeDataItemArweave })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })
  const deleteMsgData = deleteMsgDataWith({ deleteMsg, logger })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      /*
        If the tx has a target that is not a process, it has
        been written directly to Arweave. So we dont go through
        the rest of the message passing process we just return
        ctx.
      */
      .chain((ctx) => {
        return writeMessage(ctx)
          .chain((ctx) => {
            return ctx.arweaveTx
              ? of(ctx)
              : of(ctx)
                .chain(getCuAddress)
                .chain(fetchAndSaveResult)
                .chain(deleteMsgData)
          })
      })
  }
}

/**
 * process a spawn that comes from the cu result endpoint
 */
export function processSpawnWith ({
  logger,
  locateScheduler,
  locateProcess,
  writeDataItem,
  buildAndSign,
  deleteSpawn
}) {
  const spawnProcess = spawnProcessWith({ logger, writeDataItem, locateScheduler, locateProcess, buildAndSign })
  const buildSuccessTx = buildSuccessTxWith({ logger, buildAndSign })
  const sendSpawnSuccess = sendSpawnSuccessWith({ logger, writeDataItem, locateProcess })
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
  startProcessMonitor,
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const start = startWith({ logger, startProcessMonitor })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(start)
  }
}

export function stopMonitorProcessWith ({
  logger,
  createDataItem,
  stopProcessMonitor,
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const stop = stopWith({ logger, stopProcessMonitor })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(stop)
  }
}

export function traceMsgsWith ({ logger, findMessageTraces }) {
  const traceMsgs = loadTracesWith({ logger, findMessageTraces })

  return (ctx) => {
    return of(ctx)
      .chain(traceMsgs)
  }
}
