import { of, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  schedulerTx: z.object({
    id: z.string(),
    timestamp: z.number(),
    block: z.number()
  })
}).passthrough()

export function writeProcessTxWith (env) {
  const { logger, writeDataItem } = env

  const writeScheduler = fromPromise(writeDataItem)

  return (ctx) => {
    return of(ctx.tx.data)
      .chain(writeScheduler)
      .map(assoc('schedulerTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "schedulerTx" to ctx'))
  }
}
