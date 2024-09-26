import { of, Rejected, fromPromise, Resolved } from 'hyper-async'
import { identity } from 'ramda'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { pullResultWith } from '../lib/pull-result.js'
import { writeAssignWith } from '../lib/write-assign.js'
import { locateProcessSchema } from '../dal.js'

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

  const locateProcessLocal = fromPromise(locateProcessSchema.implement(locateProcess))

  const sendAssign = (ctx) => writeAssign(ctx)
    .bichain(
      (error) => {
        return of(error)
          .map(() => logger({ log: ['Initial assignment failed %s', ctx.txId] }, ctx))
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
        .chain(({ msgs, spawns, assigns, initialTxId, parentId }) => {
          return crank({
            msgs,
            spawns,
            assigns,
            initialTxId,
            parentId
          })
        })
        .bimap(
          (res) => {
            logger({ log: 'Failed to push messages from assignment', end: true }, ctx)
            return res
          },
          (res) => {
            logger({ log: 'Pushing complete', end: true }, ctx)
            return res
          }
        )
    }))

  return (ctx) => {
    return of(ctx)
      .chain((ctx) =>
        locateProcessLocal(ctx.assign.processId)
          .chain((schedLocation) => sendAssign({ ...ctx, schedLocation }))
          .bimap(
            (e) => new Error(e, { cause: ctx }),
            identity
          )
      )
  }
}
