import { of, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  contractTx: z.any()
}).passthrough()

export function createContractWith (env) {
  const { logger, writeContractTx } = env

  return (ctx) => {
    const { initState, src, tags } = ctx.cachedSpawn.spawn
    const transformedData = { initState, src, tags }

    return of(transformedData)
      .chain(fromPromise(writeContractTx))
      .bichain(
        (error) => {
          console.error('writeContractTx failed. Recovering and returning original ctx.', error)
          return of(ctx)
        },
        (result) => {
          return of(result)
            .map(assoc('contractTx', __, ctx))
            .map(ctxSchema.parse)
            .map(logger.tap('Added "contractTx" to ctx'))
        }
      )
  }
}
