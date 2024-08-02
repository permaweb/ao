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
          .map(logger.tap({ log: ['Initial assignment failed %s', ctx.txId], options: { messageId: ctx.messageId, processId: ctx.processId } }))
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
        .chain(({ msgs, spawns, assigns, initialTxId }) => {
          return crank({
            msgs,
            spawns,
            assigns,
            initialTxId
          })
        })
        .bimap(
          (res) => {
            logger({ log: 'Failed to crank messages from assignment', options: { messageId: ctx.messageId, processId: ctx.processId, end: true } }, ctx)
            return res
          },
          (res) => {
            logger({ log: 'Cranking complete', options: { messageId: ctx.messageId, processId: ctx.processId, end: true } }, ctx)
            return res
          }
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
