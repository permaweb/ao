import { of, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  spawnSuccessSequencerTx: z.any()
}).passthrough()

export function sendSpawnSuccessWith (env) {
  let { logger, writeDataItem, locateProcess } = env

  locateProcess = fromPromise(locateProcess)

  return (ctx) => {
    return of(ctx.cachedSpawn.processId)
      .chain(locateProcess)
      .map((schedulerResult) => { return { suUrl: schedulerResult.url, data: ctx.spawnSuccessTx.data.toString('base64') } })
      .chain(fromPromise(writeDataItem))
      .bichain(
        (error) => {
          console.error('writeDataItem failed. Recovering and returning original ctx.', error)
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
