import { of } from 'hyper-async'

import { getCuAddressWith } from './processMsg/get-cu-address.js'
import { cacheAndWriteTxWith } from './processMsg/cache-and-write-tx.js'
import { fetchAndSaveResultWith } from './processMsg/fetch-and-save-result.js'
import { buildTxWith } from './processMsg/build-tx.js'
import { crankWith } from './crank/crank.js'
import { createContractWith } from './processSpawn/create-contract.js'
import { parseDataItemWith } from './processMsg/parse-data-item.js'
import { saveWith } from './monitorProcess/saveProcess.js'
import { appendGatewayDataWith } from './monitorProcess/appendGatewayData.js'

/**
 * write the first transaction and fetch its messages
 */
export function initMsgsWith ({
  createDataItem,
  cacheTx,
  selectNode,
  findSequencerTx,
  writeSequencerTx,
  fetchResult,
  saveMsg,
  saveSpawn,
  findLatestMsgs,
  findLatestSpawns,
  logger
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const cacheAndWriteTx = cacheAndWriteTxWith({ cacheTx, findSequencerTx, writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(getCuAddress)
      .chain(cacheAndWriteTx)
      .chain(fetchAndSaveResult)
  }
}

/**
 * process a single message and return its responses
 */
export function processMsgWith ({
  findLatestCacheTx,
  createDataItem,
  cacheTx,
  selectNode,
  findSequencerTx,
  writeSequencerTx,
  fetchResult,
  saveMsg,
  saveSpawn,
  buildAndSign,
  updateMsg,
  findLatestMsgs,
  findLatestSpawns,
  logger
}) {
  const buildTx = buildTxWith({ buildAndSign, logger })

  const initMsgs = initMsgsWith({
    createDataItem,
    cacheTx,
    selectNode,
    findSequencerTx,
    writeSequencerTx,
    fetchResult,
    saveMsg,
    saveSpawn,
    findLatestMsgs,
    findLatestSpawns,
    logger
  })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain(initMsgs)
  }
}

/**
 * process a spawn that comes from the cu result endpoint
 */
export function processSpawnWith ({
  logger,
  writeContractTx
}) {
  const createContract = createContractWith({
    logger,
    writeContractTx
  })

  return (ctx) => {
    return of(ctx)
      .chain(createContract)
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


export function monitorProcessWith({
  logger,
  createDataItem,
  saveProcessToMonitor,
  fetchGatewayProcess
}) {
  const parse = parseDataItemWith({ createDataItem, logger })
  const save = saveWith({ logger, saveProcessToMonitor })
  const appendGatewayData = appendGatewayDataWith({logger, fetchGatewayProcess})
  return (ctx) => {
    return of(ctx)
      .chain(parse)
      .chain(appendGatewayData)
      .chain(save)
  }
}