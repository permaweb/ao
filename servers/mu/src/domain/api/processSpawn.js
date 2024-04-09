import { of } from 'hyper-async'

import { spawnProcessWith } from '../lib/spawn-process.js'
import { sendSpawnSuccessWith } from '../lib/send-spawn-success.js'
import { buildSuccessTxWith } from '../lib/build-success-tx.js'

/**
 * process a spawn that comes from the cu result endpoint
 */
export function processSpawnWith ({
  logger,
  locateScheduler,
  locateProcess,
  locateNoRedirect,
  writeDataItem,
  buildAndSign
}) {
  const spawnProcess = spawnProcessWith({ logger, writeDataItem, locateScheduler, locateNoRedirect, buildAndSign })
  const buildSuccessTx = buildSuccessTxWith({ logger, buildAndSign })
  const sendSpawnSuccess = sendSpawnSuccessWith({ logger, writeDataItem, locateProcess })

  return (ctx) => {
    return of(ctx)
      .chain(spawnProcess)
      .chain(buildSuccessTx)
      .chain(sendSpawnSuccess)
  }
}
