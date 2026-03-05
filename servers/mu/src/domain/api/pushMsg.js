import { Rejected, Resolved, fromPromise, of } from 'hyper-async'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { pullResultWith } from '../lib/pull-result.js'
import { getCustomCuAddressWith } from '../lib/get-custom-cu-address.js'

export function pushMsgWith ({
  selectNode,
  fetchResult,
  fetchTransaction,
  crank,
  logger,
  ALLOW_PUSHES_AFTER,
  ENABLE_PUSH,
  ENABLE_CUSTOM_PUSH,
  CUSTOM_CU_MAP_FILE_PATH
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const getCustomCuAddress = getCustomCuAddressWith({ CUSTOM_CU_MAP_FILE_PATH, logger })
  const pullResult = pullResultWith({ fetchResult, logger })
  const fetchTransactionAsync = fromPromise(fetchTransaction)

  return (ctx) => {
    // If push is disabled, return the context immediately
    if (!ENABLE_PUSH) {
      return Rejected('Push is disabled')
    }

    return of(ctx)
      .chain((ctx) => {
        return fetchTransactionAsync({ messageId: ctx.tx.id, processId: ctx.tx.processId })
          .chain(res => {
            console.log(res)
            console.log(ALLOW_PUSHES_AFTER)
            if (res.block >= ALLOW_PUSHES_AFTER) {
              return Resolved(ctx)
            }
            return Rejected(new Error('Message id not found on the scheduler with a valid block.', { cause: ctx }))
          })
      })
      .chain((ctx) => {
        if (ENABLE_CUSTOM_PUSH && ctx.customCu) {
          return getCustomCuAddress(ctx)
        }
        return getCuAddress(ctx)
      })
      .chain(pullResult)
      .chain((res) => {
        const { msgs, number } = res
        if (msgs.length <= number) {
          return Rejected(new Error('Message number does not exist in the result.', { cause: ctx }))
        }
        return Resolved(res)
      })
      .bichain(
        (error) => {
          return of(error)
            .map(() => logger({ log: 'Initial result failed: with error' }, ctx))
            .chain(() => Rejected(error))
        },
        (res) => Resolved(res)
      )
      .map(res => ({
        ...res,
        /**
           * An opaque method to fetch the result of the message just forwarded
           * and then crank its results
           */
        crank: () => of({ ...res })
          .chain((ctx) => {
            const { msgs, initialTxId, messageId: parentId, number } = ctx
            return crank({
              msgs: [msgs[number]],
              spawns: [],
              assigns: [],
              initialTxId,
              parentId
            })
          })
          .bimap(
            (res) => {
              logger({ log: 'Failed to push messages', end: true }, ctx)
              return res
            },
            (res) => {
              logger({ log: 'Pushing complete', end: true }, ctx)
              return res
            }
          )
      }))
  }
}
