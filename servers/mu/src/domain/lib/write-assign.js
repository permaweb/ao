import { fromPromise } from 'hyper-async'
import z from 'zod'

const ctxSchema = z.object({
  tx: z.object({
    id: z.string(),
    processId: z.string()
  }).passthrough()
}).passthrough()

export function writeAssignWith (env) {
  let { logger, writeAssignment } = env

  writeAssignment = fromPromise(writeAssignment)

  return (ctx) => {
    return writeAssignment({
      suUrl: ctx.schedLocation.url,
      txId: ctx.assign.txId,
      processId: ctx.assign.processId,
      baseLayer: ctx.assign.baseLayer,
      exclude: ctx.assign.exclude
    })
    /*
            return the tx in this shape so we can pull
            the result on it from the cu
        */
      .map((suRes) => {
        return {
          ...ctx,
          tx: {
            id: suRes.id,
            processId: ctx.assign.processId
          }
        }
      })
      .map(ctxSchema.parse)
      .map(logger.tap('Added "tx" to ctx'))
  }
}
