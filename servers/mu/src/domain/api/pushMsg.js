import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { __, assoc, identity } from 'ramda'

import { getCuAddressWith } from '../lib/get-cu-address.js'
import { pullResultWith } from '../lib/pull-result.js'

export function pushMsgWith ({
  selectNode,
  fetchResult,
  fetchTransactions,
  crank,
  logger,
  ALLOW_PUSHES_AFTER,
  ENABLE_CUSTOM_PUSH
}) {
  const getCuAddress = getCuAddressWith({ selectNode, logger })
  const pullResult = pullResultWith({ fetchResult, logger })
  const fetchTransactionsAsync = fromPromise(fetchTransactions)

  return (ctx) => {
    return of(ctx)
      .chain((ctx) => {
        return fetchTransactionsAsync([ctx.tx.id])
      })
      .chain(res => {
        if(res?.data?.transactions?.edges?.length >= 1) {
          if(res.data.transactions.edges[0].node?.block?.height) {
            if (res.data.transactions.edges[0].node.block.height >= ALLOW_PUSHES_AFTER) {
              return Resolved(ctx)
            } 
          }
          return Rejected(new Error('Message does not yet have a block', { cause: ctx }))
        }
        return Rejected(new Error('Message id not found on the gateway.', { cause: ctx }))
      })
      .chain((ctx) => {
        if (ENABLE_CUSTOM_PUSH && ctx.customCuUrl) {
          return of(ctx.customCuUrl)
            .map(assoc('cuAddress', __, ctx))
            .bimap(
              (e) => {
                return new Error(e, { cause: ctx })
              },
              identity
            )
            .map(logger.tap({ log: 'Added custom cuAddress to ctx' }))
        }
        return getCuAddress(ctx)
      })
      .chain(pullResult)
      .chain((res) => {
        const { msgs, number } = res
        if(msgs.length <= number) {
          return Rejected(new Error('Message number does not exist in the result.', { cause: ctx }))
        }
        return Resolved(res)
      })
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