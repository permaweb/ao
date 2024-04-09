import { fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

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
    if (ctx.schedLocation) {
      return writeDataItem({ suUrl: ctx.schedLocation.url, data: ctx.tx.data.toString('base64') })
        .map(assoc('schedulerTx', __, ctx))
        .map(ctxSchema.parse)
        .map(logger.tap('Added "schedulerTx" to ctx'))
    } else {
      return writeDataItemArweave(ctx.tx.data)
        .map(assoc('arweaveTx', __, ctx))
        .map(ctxSchemaArweave.parse)
        .map(logger.tap('Added "arweaveTx" to ctx'))
    }
  }
}
