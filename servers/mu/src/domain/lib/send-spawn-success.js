import { of, fromPromise, Resolved } from 'hyper-async'
import { __, assoc, identity } from 'ramda'
import z from 'zod'
import { checkStage } from '../utils.js'
import { locateProcessSchema } from '../dal.js'

const ctxSchema = z.object({
  spawnSuccessSequencerTx: z.any()
}).passthrough()

export function sendSpawnSuccessWith (env) {
  let { logger, writeDataItem, locateProcess } = env

  locateProcess = fromPromise(locateProcessSchema.implement(locateProcess))

  return (ctx) => {
    if (!checkStage('send-spawn-success')(ctx)) return Resolved(ctx)
    return of(ctx.cachedSpawn.processId)
      .chain(locateProcess)
      .map((schedulerResult) => { return { suUrl: schedulerResult.url, data: ctx.spawnSuccessTx.data.toString('base64'), logId: ctx.logId } })
      .chain(fromPromise(writeDataItem))
      .chain(
        (result) => {
          return of(result)
            .map(assoc('spawnSuccessSequencerTx', __, ctx))
            .map(ctxSchema.parse)
            .map(logger.tap({ log: 'Added spawnSuccessSequencerTx to ctx' }))
        }
      )
      .bimap(
        (error) => {
          console.error('writeDataItem failed. Recovering and returning original ctx.', error)
          return new Error(error, { cause: ctx })
        },
        identity
      )
  }
}
