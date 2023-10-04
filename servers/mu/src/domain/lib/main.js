import { of } from 'hyper-async'

import { getCuAddressWith } from './processMsg/get-cu-address.js'
import { cacheAndWriteTxWith } from './processMsg/cache-and-write-tx.js'
import { fetchAndSaveMsgsWith } from './processMsg/fetch-and-save-msgs.js'
import { buildTxWith } from './processMsg/build-tx.js'
import { crankWith } from './crankMsgs/crank.js'

/**
 * write the first transaction and fetch its messages
 */
export function initMsgsWith ({
  findLatestCacheTx,
  cacheTx,
  selectNode,
  findSequencerTx,
  writeSequencerTx,
  fetchMsgs,
  saveMsg,
  findLatestMsgs,
  logger
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })

  const cacheAndWriteTx = cacheAndWriteTxWith({
    findLatestCacheTx,
    cacheTx,
    findSequencerTx,
    writeSequencerTx,
    logger
  })

  const fetchAndSaveMsgs = fetchAndSaveMsgsWith({
    fetchMsgs,
    saveMsg,
    findLatestMsgs,
    logger
  })

  return (ctx) => {
    return of(ctx)
      .chain(getCuAddress)
      .chain(cacheAndWriteTx)
      .chain(fetchAndSaveMsgs)
  }
}

/**
 * process a single message and return its responses
 */
export function processMsgWith ({
  findLatestCacheTx,
  cacheTx,
  selectNode,
  findSequencerTx,
  writeSequencerTx,
  fetchMsgs,
  saveMsg,
  buildAndSign,
  updateMsg,
  findLatestMsgs,
  logger
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })

  const cacheAndWriteTx = cacheAndWriteTxWith({
    findLatestCacheTx,
    cacheTx,
    findSequencerTx,
    writeSequencerTx,
    logger
  })

  const fetchAndSaveMsgs = fetchAndSaveMsgsWith({
    fetchMsgs,
    saveMsg,
    findLatestMsgs,
    logger
  })

  const buildTx = buildTxWith({
    buildAndSign,
    logger
  })

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain(getCuAddress)
      .chain(cacheAndWriteTx)
      .chain(fetchAndSaveMsgs)
  }
}

/**
 * accept list of msgs and crank them
 */
export function crankMsgsWith ({
  processMsg,
  logger
}) {
  const crank = crankWith({ processMsg, logger })
  return (ctx) => {
    return of(ctx)
      .chain(crank)
  }
}

/**
 * process a spawn that comes from the cu result endpoint
 */
export function spawnWith ({
  logger
}) {
  return (ctx) => {
    return of(ctx)
      .chain(() => ctx)
  }
}
