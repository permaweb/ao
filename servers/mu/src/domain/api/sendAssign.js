import { of, Rejected, fromPromise, Resolved } from 'hyper-async'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { pullResultWith } from '../lib/pull-result.js'
import { writeAssignWith } from '../lib/write-assign.js'

/**
 * Forward along the Assignment to the SU then return crank
 */
export function sendAssignWith ({
  selectNode,
  writeAssignment,
  locateProcess,
  fetchResult,
  crank,
  logger
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const pullResult = pullResultWith({ fetchResult, logger })
  const writeAssign = writeAssignWith({ writeAssignment, logger })

  const locateProcessLocal = fromPromise(locateProcess)

  const sendAssign = (ctx) => writeAssign(ctx)
    .bichain(
      (error) => {
        return of(error)
          .map(logger.tap('Initial assignment failed %s', ctx.txId))
          .chain(() => Rejected(error))
      },
      (res) => Resolved(res)
    )
    .map(res => ({
      ...res,
      /**
         * return the crank function
         */
      crank: () => of({ ...res, initialTxId: res.tx.id })
        .chain(getCuAddress)
        .chain(pullResult)
        .chain(({ msgs, spawns, assigns, initialTxId }) => crank({
          msgs,
          spawns,
          assigns,
          initialTxId
        }))
        .bimap(
          logger.tap('Failed to crank messages from assignment'),
          logger.tap('Cranking complete')
        )
    }))

  return (ctx) => {
    return of(ctx)
      .chain((ctx) =>
        locateProcessLocal(ctx.assign.processId)
          .chain((schedLocation) => sendAssign({ ...ctx, schedLocation }))
      )
  }
}
