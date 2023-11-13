import { of, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  spawnSuccessSequencerTx: z.any()
}).passthrough()

export function sendSpawnSuccessWith (env) {
  const { logger, writeSequencerTx } = env

  return (ctx) => {
    return of(ctx.spawnSuccessTx)
      .chain(fromPromise(writeSequencerTx))
      .bichain(
        (error) => {
          console.error('writeSequencerTx failed. Recovering and returning original ctx.', error)
          return of(ctx)
        },
        (result) => {
          return of(result)
            .map(assoc('spawnSuccessSequencerTx', __, ctx))
            .map(ctxSchema.parse)
            .map(logger.tap('Added "spawnSuccessSequencerTx" to ctx'))
        }
      )
  }
}
