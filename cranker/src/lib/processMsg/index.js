import { of, fromPromise } from 'hyper-async'

import { buildTxWith } from './build-tx.js'
import { getCuAddressWith } from './get-cu-address.js'
import { writeMessageTxWith } from './write-message-tx.js'

/**
 * Take a single entry from a cron result, process it,
 * and return a cu result for the tx id
 */

export function processMsgWith ({
  locateProcess,
  selectNode,
  writeDataItem,
  fetchResult,
  buildAndSign,
  logger,
  writeDataItemArweave
}) {
  const buildTx = buildTxWith({ buildAndSign, logger })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ writeDataItem, locateProcess, logger, writeDataItemArweave })

  return (ctx) => of(ctx)
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
              .chain(fromPromise((res) => fetchResult(res.tx.id, res.tx.processId)))
        })
    })
}
