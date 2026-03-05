import { Rejected, of } from 'hyper-async'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { writeMessageTxWith } from '../lib/write-message-tx.js'
import { pullResultWith } from '../lib/pull-result.js'
import { buildTxWith } from '../lib/build-tx.js'
import { setStage } from '../utils.js'

/**
 * process a single message and return its responses
 * the input to this is a cu result
 */
export function processMsgWith ({
  locateProcess,
  selectNode,
  writeDataItem,
  fetchResult,
  buildAndSign,
  logger,
  writeDataItemArweave,
  isWallet,
  fetchSchedulerProcess,
  isHyperBeamProcess,
  fetchProcessWhitelist
}) {
  const buildTx = buildTxWith({ buildAndSign, logger, locateProcess, fetchSchedulerProcess, isWallet, isHyperBeamProcess })
  const writeMessage = writeMessageTxWith({ writeDataItem, logger, writeDataItemArweave })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const pullResult = pullResultWith({ fetchResult, logger })

  return (ctx) => {
    return of(ctx)
      .map(setStage('start', 'build-tx'))
      .chain(buildTx)
      .map(setStage('build-tx', 'write-message'))
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
                .map(setStage('write-message-arweave', 'end'))
              : of(ctx)
                .map(setStage('write-message-su', 'get-cu-address'))
                .chain((ctx) => {
                  const whitelist = fetchProcessWhitelist ? fetchProcessWhitelist() : {}
                  if (whitelist && !whitelist[ctx.cachedMsg.processId]) {
                    const error = new Error('Forbidden, process not whitelisted')
                    error.status = 403
                    return Rejected(error)
                  }
                  return of(ctx)
                })
                .chain(getCuAddress)
                .map(setStage('get-cu-address', 'pull-result'))
                .chain(pullResult)
                .map(setStage('pull-result', 'end'))
          })
      })
      .bimap(
        (e) => {
          return new Error(e, { cause: e.cause })
        },
        logger.tap({ log: 'Successfully processed message', end: true })
      )
  }
}
