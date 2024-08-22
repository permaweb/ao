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
  const pullResult = pullResultWith({ logger, fetchResult })

  return (ctx) => {
    return of(ctx)
      .map(setStage('start', 'spawn-process'))
      .chain(spawnProcess)
      .map(setStage('spawn-process', 'pull-initial-result'))
      .chain((res) => {
        /**
         * Fetch the initial boot result for the process
         * itself as per aop6 Boot Loader, add it to ctx
         *
         * See: https://github.com/permaweb/ao/issues/730
         */
        return pullResult({
          processId: res.processTx,
          messageId: res.processTx,
          initialTxId: ctx.initialTxId,
          tx: { id: res.processTx, processId: res.processTx }
        }).map((result) => ({
          ...res,
          msgs: result.msgs,
          spawns: result.spawns,
          assigns: result.assigns,
          initialTxId: res.initialTxId
        }))
      })
      .map(setStage('pull-initial-result', 'build-success-tx'))
      .chain(buildSuccessTx)
      .map(setStage('build-success-tx', 'send-spawn-success'))
      .chain(sendSpawnSuccess)
      .map(setStage('send-spawn-success', 'pull-result'))
      .chain((res) => {
        /**
         * Combine the return from pullResult on the success
         * tx, with the pullResult for the process id, so they
         * all will get pushed
         */
        return pullResult({ ...res, tx: { ...res.spawnSuccessTx } }).map((spawnRes) => {
          return {
            ...res,
            msgs: [...(res.msgs || []), ...(spawnRes.msgs || [])],
            assigns: [...(res.assigns || []), ...(spawnRes.assigns || [])],
            initialTxId: res.initialTxId,
            spawns: [...(res.spawns || []), ...(spawnRes.spawns || [])]
          }
        })
      })
      .map(setStage('pull-result', 'end'))
      .bimap(
        (e) => {
          return new Error(e, { cause: e.cause })
        },
        logger.tap({ log: 'Successfully processed spawn', end: true })
      )
  }
}
