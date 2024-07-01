import { of, fromPromise, Resolved } from 'hyper-async'
import z from 'zod'
import { setStage } from '../utils.js'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any(),
  assigns: z.any(),
  initialTxId: z.any()
}).passthrough()

function fetchResultWith ({ fetchResult }) {
  const fetchResultAsync = fromPromise(fetchResult)

  return (ctx) =>
    fetchResultAsync(ctx.tx.id, ctx.tx.processId)
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
    if (ctx.stage === 'pull-result') {
      console.log(30, { ctx })
      throw new Error('Error test 123', { cause: ctx })
    }
    return of(ctx)
      .chain(fetchResult)
      .bichain(Resolved, Resolved)
      .map(ctxSchema.parse)
      .map(setStage('pull-result', 'end'))
      .map(logger.tap('Added "msgs, spawns, and assigns" to ctx'))
  }
}
