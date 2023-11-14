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
import { saveWith } from './monitor/saveProcess.js'
import { appendSequencerDataWith } from './monitor/appendSequencerData.js'
import { deleteMsgDataWith } from './processMsg/delete-msg-data.js'
import { deleteSpawnDataWith } from './processSpawn/delete-spawn-data.js'

export function sendMsgWith ({
  createDataItem,
  selectNode,
  findSequencerTx,
  writeSequencerTx,
  fetchResult,
  saveMsg,
  saveSpawn,
  findLatestMsgs,
  findLatestSpawns,
  processMsg,
  processSpawn,
  logger
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeTx = writeTxWith({ findSequencerTx, writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  const crank = crankWith({ processMsg, processSpawn, logger })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(writeTx)
      .map(res => ({
        ...res,
        /**
         * An opaque method to fetch the result of the message just forwarded
         * and then crank its results
         */
        crank: () => of(res)
          .chain(getCuAddress)
          .chain(fetchAndSaveResult)
          .chain(({ msgs, spawns }) => crank({ msgs, spawns }))
      }))
  }
}

/**
 * process a single message and return its responses
 * the input to this is a cached cu result
 */
export function processMsgWith ({
  selectNode,
  findSequencerTx,
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
  const buildTx = buildTxWith({ 
    buildAndSign, 
    logger 
  })

  const getCuAddress = getCuAddressWith({ 
    selectNode, 
    logger 
  })

  const writeTx = writeTxWith({ 
    findSequencerTx, 
    writeSequencerTx, logger 
  })

  const fetchAndSaveResult = fetchAndSaveResultWith({ 
    fetchResult, 
    saveMsg, 
    saveSpawn, 
    findLatestMsgs, 
    findLatestSpawns, 
    logger 
  })

  const deleteMsgData = deleteMsgDataWith({
    deleteMsg, 
    logger
  })

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
  const spawnProcess = spawnProcessWith({
    logger,
    writeProcessTx
  })

  const buildSuccessTx = buildSuccessTxWith({
    logger,
    buildAndSign
  })

  const sendSpawnSuccess = sendSpawnSuccessWith({
    logger, 
    writeSequencerTx
  })

  const deleteSpawnData = deleteSpawnDataWith({
    logger,
    deleteSpawn
  })

  return (ctx) => {
    return of(ctx)
      .chain(spawnProcess)
      .chain(buildSuccessTx)
      .chain(sendSpawnSuccess)
      .chain(deleteSpawnData)
  }
}

/**
 * accept list of msgs and crank them
 */
export function crankMsgsWith ({
  processMsg,
  processSpawn,
  logger
}) {
  const crank = crankWith({ processMsg, processSpawn, logger })
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
  const parse = parseDataItemWith({ createDataItem, logger })
  const save = saveWith({ logger, saveProcessToMonitor })
  const appendSequencerData = appendSequencerDataWith({ logger, fetchSequencerProcess })
  return (ctx) => {
    return of(ctx)
      .chain(parse)
      .chain(appendSequencerData)
      .chain(save)
  }
}
