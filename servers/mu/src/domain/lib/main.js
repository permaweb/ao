import { of } from 'hyper-async'

import { getCuAddressWith } from './processMsg/get-cu-address.js'
import { writeTxWith } from './processMsg/write-tx.js'
import { fetchAndSaveResultWith } from './processMsg/fetch-and-save-result.js'
import { buildTxWith } from './processMsg/build-tx.js'
import { crankWith } from './crank/crank.js'
import { createContractWith } from './processSpawn/create-contract.js'
import { parseDataItemWith } from './processMsg/parse-data-item.js'
import { saveWith } from './monitor/saveProcess.js'
import { appendSequencerDataWith } from './monitor/appendSequencerData.js'

/**
 * write the first transaction and fetch its messages
 * the difference between this and processMsg is that this
 * takes a data item, while processMsg works on a cached
 * cu result
 */
export function initMsgsWith ({
  createDataItem,
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
  const writeTx = writeTxWith({ findSequencerTx, writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  return (ctx) => {
    return of(ctx)
      .chain(parseDataItem)
      .chain(getCuAddress)
      .chain(writeTx)
      .chain(fetchAndSaveResult)
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
  updateMsg,
  findLatestMsgs,
  findLatestSpawns,
  logger
}) {
  const buildTx = buildTxWith({ buildAndSign, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeTx = writeTxWith({ findSequencerTx, writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain(getCuAddress)
      .chain(writeTx)
      .chain(fetchAndSaveResult)
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
  fetchSequencerProcess
}) {
  const parse = parseDataItemWith({ createDataItem, logger })
  const save = saveWith({ logger, saveProcessToMonitor })
  const appendSequencerData = appendSequencerDataWith({logger, fetchSequencerProcess})
  return (ctx) => {
    return of(ctx)
      .chain(parse)
      .chain(appendSequencerData)
      .chain(save)
  }
}