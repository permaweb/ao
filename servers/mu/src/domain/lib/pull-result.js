import { of, fromPromise, Resolved } from 'hyper-async'
import z from 'zod'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any(),
  assigns: z.any(),
  initialTxId: z.string().nullable()
}).passthrough()

function fetchResultWith ({ fetchResult }) {
  const fetchResultAsync = fromPromise(fetchResult)

  return (ctx) =>
    fetchResultAsync(ctx.tx.id, ctx.tx.processId)
      .chain(fetchedResult => {
        const msgs = fetchedResult.Messages.map(msg => {
          return {
            fromTxId: ctx.tx.id,
            msg,
            processId: ctx.tx.processId,
            initialTxId: ctx.initialTxId
          }
        })

        const spawns = fetchedResult.Spawns.map(spawn => {
          return {
            fromTxId: ctx.tx.id,
            spawn,
            processId: ctx.tx.processId,
            initialTxId: ctx.initialTxId
          }
        })

        const assigns = fetchedResult.Assignments.map(assign => {
          return {
            fromTxId: ctx.tx.id,
            assign,
            processId: ctx.tx.processId,
            initialTxId: ctx.initialTxId
          }
        })

        return of({ ...ctx, msgs, spawns, assigns })
      })
}

export function pullResultWith (env) {
  const { logger } = env

  const fetchResult = fetchResultWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(fetchResult)
      .bichain(Resolved, Resolved)
      .map(ctxSchema.parse)
      .map(logger.tap('Added "msgs, spawns, and assigns" to ctx'))
  }
}
