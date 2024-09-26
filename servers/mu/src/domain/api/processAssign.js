import { of, fromPromise, Resolved } from 'hyper-async'

import { pullResultWith } from '../lib/pull-result.js'
import { writeAssignWith } from '../lib/write-assign.js'
import { checkStage, setStage } from '../utils.js'
import { locateProcessSchema } from '../dal.js'

/**
 * process an assignment that comes from the cu result endpoint
 *
 * Assignment shape
 * [{ Processes: [ "pid1", "pid2" ], Message: "txid" }]
 */
export function processAssignWith ({
  locateProcess,
  writeAssignment,
  fetchResult,
  logger
}) {
  const writeAssign = writeAssignWith({ writeAssignment, logger })
  const pullResult = pullResultWith({ fetchResult, logger })

  const locateProcessLocal = fromPromise(locateProcessSchema.implement(locateProcess))

  return (ctx) => {
    return of(ctx)
      .map(setStage('start', 'locate-process-local'))
      .chain((ctx) => {
        if (!checkStage('locate-process-local')(ctx)) return Resolved(ctx)
        return locateProcessLocal(ctx.assign.processId)
          .bimap(
            (e) => {
              return new Error(e, { cause: ctx })
            },
            (schedLocation) => {
              return { ...ctx, schedLocation }
            })
      })
      .map(setStage('locate-process-local', 'write-assign'))
      .chain(writeAssign)
      .map(setStage('write-assign', 'pull-result'))
      .chain(pullResult)
      .map(setStage('pull-result', 'end'))
      .bimap(
        (e) => {
          return new Error(e, { cause: e.cause })
        },
        logger.tap({ log: 'Successfully processed assign', end: true })
      )
  }
}
