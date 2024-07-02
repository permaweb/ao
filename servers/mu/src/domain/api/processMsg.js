import { of } from 'hyper-async'

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
  fetchSchedulerProcess
}) {
  const buildTx = buildTxWith({ buildAndSign, logger, locateProcess, fetchSchedulerProcess, isWallet })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ writeDataItem, logger, writeDataItemArweave })
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
                .chain(getCuAddress)
                .map(setStage('get-cu-address', 'pull-result'))
                .chain(pullResult)
                .map(setStage('pull-result', 'end'))
          })
      })
      .bimap(
        (e) => {
          console.log('processMsgErr:', { ctx, e })
          return new Error(e, { cause: e.cause })
        },
        logger.tap('processMsgSuccess')
      )
  }
}
