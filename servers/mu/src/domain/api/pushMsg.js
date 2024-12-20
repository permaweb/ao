import { Rejected, Resolved, of } from 'hyper-async'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { pullResultWith } from '../lib/pull-result.js'

export function pushMsgWith ({
  selectNode,
  fetchResult,
  crank,
  logger,
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const pullResult = pullResultWith({ fetchResult, logger })

  return (ctx) => {
    return of(ctx)
      .chain(pullResult)
      .bichain(
        (error) => {
          return of(error)
            .map(() => logger({ log: `Initial result failed: with error` }, ctx))
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
        crank: () => of({ ...res, initialTxId: res.tx.id })
          .chain(getCuAddress)
          .chain(pullResult)
          .chain((ctx) => {
            const { msgs, spawns, assigns, initialTxId, messageId: parentId } = ctx
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