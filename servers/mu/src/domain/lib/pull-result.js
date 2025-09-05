import { of, fromPromise, Resolved } from 'hyper-async'
import z from 'zod'
import { checkStage } from '../utils.js'
import { resultSchema } from '../dal.js'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any(),
  assigns: z.any(),
  initialTxId: z.any()
}).passthrough()

function fetchResultWith ({ fetchResult, fetchHyperBeamResult }) {
  const fetchResultAsync = fromPromise(resultSchema.implement(fetchResult))
  const fetchHyperBeamResultAsync = fetchHyperBeamResult ? fromPromise(fetchHyperBeamResult) : null

  return (ctx) => {
    return of(ctx)
      .chain(() => {
        // Use HyperBeam result fetching if scheduler type is hyperbeam and we have assignment info
        if (ctx.schedulerType === 'hyperbeam' && fetchHyperBeamResultAsync && ctx.schedulerTx?.slot) {
          return fetchHyperBeamResultAsync({
            processId: ctx.tx.processId,
            suUrl: ctx.schedLocation.url,
            assignmentNum: ctx.schedulerTx.slot, // Use scheduler tx id as assignment number
            logId: ctx.logId
          })
        } else {
          // Use legacy CU result fetching
          return fetchResultAsync(ctx.tx.id, ctx.tx.processId, ctx.logId, ctx.customCuUrl)
        }
      })
      .chain(fetchedResult => {
        const msgs = fetchedResult.Messages
          .filter(msg =>
            msg.Target !== undefined && msg.Anchor !== undefined && msg.Tags !== undefined
          )
          .map(msg => {
            return {
              msg,
              processId: msg.Target,
              initialTxId: ctx.initialTxId,
              fromProcessId: ctx.tx.processId,
              parentId: ctx.messageId ?? ctx.initialTxId,
              wallet: ctx.wallet ?? ctx.dataItem?.owner
            }
          })

        const spawns = fetchedResult.Spawns.map(spawn => {
          return {
            spawn,
            processId: ctx.tx.processId,
            initialTxId: ctx.initialTxId,
            fromProcessId: ctx.processId,
            parentId: ctx.messageId ?? ctx.initialTxId,
            wallet: ctx.wallet ?? ctx.dataItem?.owner
          }
        })

        /*
          we have to concat on any assignments that
          come from the Assignments tag, so they get
          returned in the final result and picked up
          by the crank
        */
        const assigns = ctx.tagAssignments
          ? fetchedResult.Assignments
            .concat(ctx.tagAssignments)
          : fetchedResult.Assignments

        return of({ ...ctx, msgs, spawns, assigns })
      })
      .toPromise()
  }
}

export function pullResultWith (env) {
  const { logger } = env

  const fetchResult = fetchResultWith(env)

  return (ctx) => {
    if (!checkStage('pull-result')(ctx) && !checkStage('pull-initial-result')(ctx)) return Resolved(ctx)
    return of(ctx)
      .map((ctx) => ({ ...ctx, tx: ctx.tx }))
      .chain((ctx) => {
        return of(ctx)
          .chain(fromPromise(fetchResult))
      })
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        logger.tap({ log: 'Added msgs, spawns, and assigns to ctx' })
      )
  }
}
