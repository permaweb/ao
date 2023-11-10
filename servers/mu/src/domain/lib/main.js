import { of } from 'hyper-async'

import { getCuAddressWith } from './processMsg/get-cu-address.js'
import { cacheAndWriteTxWith } from './processMsg/cache-and-write-tx.js'
import { fetchAndSaveResultWith } from './processMsg/fetch-and-save-result.js'
import { buildTxWith } from './processMsg/build-tx.js'
import { crankWith } from './crank/crank.js'
import { createContractWith } from './processSpawn/create-contract.js'
import { parseDataItemWith } from './processMsg/parse-data-item.js'
import { saveWith } from './monitor/saveProcess.js'
import { appendSequencerDataWith } from './monitor/appendSequencerData.js'

/**
 * write the first transaction to the su,
 * and return that result, along with a method to
 * fetch it
 */
export function sendMsgWith ({
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
  processMsg,
  processSpawn,
  logger
}) {
  const parseDataItem = parseDataItemWith({ createDataItem, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const cacheAndWriteTx = cacheAndWriteTxWith({ cacheTx, findSequencerTx, writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  const crank = crankWith({ processMsg, processSpawn, logger })

  return (ctx) => {
    return of(ctx)
      /**
       * Extract parts from the data item
       */
      .chain(parseDataItem)
      /**
       * Cache the message metadata in the db, then forward
       * to the SU
       */
      .chain(cacheAndWriteTx)
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
 */
export function processMsgWith ({
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
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const cacheAndWriteTx = cacheAndWriteTxWith({ cacheTx, findSequencerTx, writeSequencerTx, logger })
  const fetchAndSaveResult = fetchAndSaveResultWith({ fetchResult, saveMsg, saveSpawn, findLatestMsgs, findLatestSpawns, logger })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain(getCuAddress)
      .chain(cacheAndWriteTx)
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
