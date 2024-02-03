import { of } from 'hyper-async'

import { spawnProcessWith } from './spawn-process.js'
import { buildSuccessTxWith } from './build-success-tx.js'
import { sendSpawnSuccessWith } from './send-spawn-success.js'

export function processSpawnWith ({
  logger,
  locateScheduler,
  locateProcess,
  writeDataItem,
  buildAndSign
}) {
  const spawnProcess = spawnProcessWith({ logger, writeDataItem, locateScheduler, locateProcess, buildAndSign })
  const buildSuccessTx = buildSuccessTxWith({ logger, buildAndSign })
  const sendSpawnSuccess = sendSpawnSuccessWith({ logger, writeDataItem, locateProcess })

  return (ctx) => {
    return of(ctx)
      .chain(spawnProcess)
      .chain(buildSuccessTx)
      .chain(sendSpawnSuccess)
  }
}
