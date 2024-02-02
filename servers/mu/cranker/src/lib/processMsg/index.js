import { of } from 'hyper-async'

import { buildTxWith } from './build-tx.js'
import { writeMessageTxWith } from './write-message-tx.js'

/**
 * Take a single entry from a cron result, process it,
 * and return a cu result for the tx id
 */

export function processMsgWith ({
  locateProcess,
  writeDataItem,
  buildAndSign,
  logger,
  writeDataItemArweave
}) {
  const buildTx = buildTxWith({ buildAndSign, logger })
  const writeMessage = writeMessageTxWith({ writeDataItem, locateProcess, logger, writeDataItemArweave })

  return (ctx) => of(ctx)
    .chain(buildTx)
    .chain(writeMessage)
}
