import { of } from 'hyper-async'

import { spawnProcessWith } from '../lib/spawn-process.js'
import { sendSpawnSuccessWith } from '../lib/send-spawn-success.js'
import { buildSuccessTxWith } from '../lib/build-success-tx.js'
import { setStage } from '../utils.js'
import { pullResultWith } from '../lib/pull-result.js'

/**
 * process a spawn that comes from the cu result endpoint
 */
export function processSpawnWith ({
  logger,
  locateScheduler,
  locateProcess,
  locateNoRedirect,
  writeDataItem,
  buildAndSign,
  fetchResult,
  fetchSchedulerProcess
}) {
  const spawnProcess = spawnProcessWith({ logger, writeDataItem, locateScheduler, locateNoRedirect, buildAndSign, fetchSchedulerProcess })
  const buildSuccessTx = buildSuccessTxWith({ logger, buildAndSign })
  const sendSpawnSuccess = sendSpawnSuccessWith({ logger, writeDataItem, locateProcess })
  const pullResult = pullResultWith({ fetchResult, logger })

  return (ctx) => {
    return of(ctx)
      .map(setStage('start', 'spawn-process'))
      .chain(spawnProcess)
      .map(setStage('spawn-process', 'build-success-tx'))
      .chain(buildSuccessTx)
      .map(setStage('build-success-tx', 'send-spawn-success'))
      .chain(sendSpawnSuccess)
      .map(setStage('send-spawn-success', 'pull-result'))
      .chain(pullResult)
      .map(setStage('pull-result', 'end'))
      .bimap(
        (e) => {
          return new Error(e, { cause: e.cause })
        },
        logger.tap({ log: 'processSpawnSuccess' })
      )
  }
}
