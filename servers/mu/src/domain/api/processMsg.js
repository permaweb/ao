import { of, fromPromise } from 'hyper-async'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { writeMessageTxWith } from '../lib/write-message-tx.js'
import { pullResultWith } from '../lib/pull-result.js'
import { buildTxWith } from '../lib/build-tx.js'

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
  fetchSchedulerProcess
}) {
  const buildTx = buildTxWith({ buildAndSign, logger, locateProcess, fetchSchedulerProcess })
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const writeMessage = writeMessageTxWith({ writeDataItem, logger, writeDataItemArweave })
  const pullResult = pullResultWith({ fetchResult, logger })

  const locateProcessLocal = fromPromise(locateProcess)

  return (ctx) => {
    return of(ctx)
      .chain(buildTx)
      .chain((ctx) => locateProcessLocal(ctx.tx.processId)
        .map((schedLocation) => {
          return { ...ctx, schedLocation }
        })
      )
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
                .chain(pullResult)
          })
      })
  }
}
