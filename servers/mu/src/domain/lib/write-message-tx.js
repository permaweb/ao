import { Resolved, fromPromise } from 'hyper-async'
import { __, assoc, identity } from 'ramda'
import z from 'zod'
import { checkStage, setStage } from '../utils.js'

const ctxSchema = z.object({
  schedulerTx: z.object({
    id: z.string(),
    timestamp: z.number()
  }).passthrough()
}).passthrough()

const ctxSchemaArweave = z.object({
  arweaveTx: z.object({
    id: z.string(),
    timestamp: z.number()
  }).passthrough()
}).passthrough()

export function writeMessageTxWith (env) {
  let { logger, writeDataItem, writeDataItemArweave } = env

  writeDataItem = fromPromise(writeDataItem)
  writeDataItemArweave = fromPromise(writeDataItemArweave)

  return (ctx) => {
    /*
      If we have schedLocation write to the scheduler.
      If not write to Arweave
    */
    if (!checkStage('write-message')(ctx)) return Resolved(ctx)
    if (ctx.schedLocation) {
      ctx = setStage('write-message', 'write-message-su')(ctx)
      console.log(23.1, { ctx })
      return writeDataItem({ suUrl: ctx.stage === 'write-message-su' ? ctx.schedLocation.url + 'abc' : ctx.schedLocation.url, data: ctx.tx.data.toString('base64') })
        .map((res) => {
          console.log(25.1, { ctx })
          return res
        })
        .map(assoc('schedulerTx', __, ctx))
        .map(ctxSchema.parse)
        .bimap(
          (e) => {
            return new Error(e, { cause: { ...ctx, stage: 'write-message' } })
          },
          identity
        )
        .map(logger.tap('Added "schedulerTx" to ctx'))
    } else {
      ctx = setStage('write-message', 'write-message-arweave')(ctx)
      console.log(23.2, { ctx })
      return writeDataItemArweave(ctx.tx.data)
        .map((res) => {
          console.log(25.2, { ctx })
          return res
        })
        .map(assoc('arweaveTx', __, ctx))
        .map(ctxSchemaArweave.parse)
        .bimap(
          (e) => {
            return new Error(e, { cause: { ...ctx, stage: 'write-message' } })
          },
          identity
        )
        .map(logger.tap('Added "arweaveTx" to ctx'))
    }
  }
}
