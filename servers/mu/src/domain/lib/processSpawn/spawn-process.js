import { of, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  contractTx: z.any()
}).passthrough()

export function spawnProcessWith (env) {
  const { logger, writeProcessTx } = env

  return (ctx) => {
    const { initState, src, tags } = ctx.cachedSpawn.spawn
    const transformedData = { initState, src, tags }

    return of(transformedData)
      .chain(fromPromise(writeProcessTx))
      .bichain(
        (error) => {
          console.error('writeProcessTx failed. Recovering and returning original ctx.', error)
          return of(ctx)
        },
        (result) => {
          return of(result)
            .map(assoc('processTx', __, ctx))
            .map(ctxSchema.parse)
            .map(logger.tap('Added "processTx" to ctx'))
        }
      )
  }
}
