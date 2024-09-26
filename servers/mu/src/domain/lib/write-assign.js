import { Resolved, fromPromise } from 'hyper-async'
import z from 'zod'
import { checkStage } from '../utils.js'
import { writeAssignmentSchema } from '../dal.js'

const ctxSchema = z.object({
  tx: z.object({
    id: z.string(),
    processId: z.string()
  }).passthrough()
}).passthrough()

export function writeAssignWith (env) {
  let { logger, writeAssignment } = env

  writeAssignment = fromPromise(writeAssignmentSchema.implement(writeAssignment))

  return (ctx) => {
    if (!checkStage('write-assign')(ctx)) return Resolved(ctx)
    return writeAssignment({
      suUrl: ctx.schedLocation.url,
      txId: ctx.assign.txId,
      processId: ctx.assign.processId,
      baseLayer: ctx.assign.baseLayer,
      exclude: ctx.assign.exclude,
      logId: ctx.logId
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
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        logger.tap({ log: 'Added "tx" to ctx' })
      )
  }
}
