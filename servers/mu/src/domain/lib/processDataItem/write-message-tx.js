import { fromPromise } from 'hyper-async'
import { __, assoc, tap } from 'ramda'
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
        /**
         * Make sure to add the message's id
         * to the trace of the parent message
         */
        .map(tap(ctx => ctx.tracer.child(ctx.tx.id)))
        .map(ctxSchema.parse)
        .map(logger.tap('Added "schedulerTx" to ctx'))
        .bimap(
          tap(() => ctx.tracer.trace('Failed to send message to SU')),
          tap(() => ctx.tracer.trace('Sent message to SU'))
        )
    } else {
      return writeDataItemArweave(ctx.tx.data)
        .map(assoc('arweaveTx', __, ctx))
        /**
         * Make sure to add the message's id
         * to the trace of the parent message
         */
        .map(tap(ctx => ctx.tracer.child(ctx.tx.id)))
        .map(ctxSchemaArweave.parse)
        .map(logger.tap('Added "arweaveTx" to ctx'))
        .bimap(
          tap(() => ctx.tracer.trace('Failed to send message to Arweave')),
          tap(() => ctx.tracer.trace('Sent message to Arweave'))
        )
    }
  }
}
