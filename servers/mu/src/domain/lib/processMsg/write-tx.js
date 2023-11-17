import { of, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  sequencerTx: z.object({
    id: z.string(),
    timestamp: z.number(),
    block: z.number()
  })
}).passthrough()

export function writeTxWith (env) {
  const { logger, writeSequencerTx } = env

  const writeSequencer = fromPromise(writeSequencerTx)

  return (ctx) => {
    return of(ctx.tx)
      .chain(writeSequencer)
      .map(assoc('sequencerTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "sequencerTx" to ctx'))
  }
}
