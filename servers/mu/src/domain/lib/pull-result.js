import { of, fromPromise, Resolved } from 'hyper-async'
import z from 'zod'
import { checkStage } from '../utils.js'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any(),
  assigns: z.any(),
  initialTxId: z.any()
}).passthrough()

function fetchResultWith ({ fetchResult }) {
  const fetchResultAsync = fromPromise(fetchResult)

  return (ctx) =>
    fetchResultAsync(ctx.tx.id, ctx.tx.processId, ctx.schedulerTx.message, ctx.cu)
      .chain(fetchedResult => {
        const msgs = fetchedResult.Messages.map(msg => {
          return {
            msg,
            processId: msg.Target,
            initialTxId: ctx.initialTxId,
            fromProcessId: ctx.tx.processId
          }
        })

        const spawns = fetchedResult.Spawns.map(spawn => {
          return {
            spawn,
            processId: ctx.tx.processId,
            initialTxId: ctx.initialTxId
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
}

export function pullResultWith (env) {
  const { logger } = env

  const fetchResult = fetchResultWith(env)

  return (ctx) => {
    if (!checkStage('pull-result')(ctx)) return Resolved(ctx)
    return of(ctx)
      .chain(fetchResult)
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        logger.tap('Added "msgs, spawns, and assigns" to ctx')
      )
  }
}
