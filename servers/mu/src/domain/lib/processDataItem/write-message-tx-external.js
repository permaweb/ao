import { of, fromPromise } from 'hyper-async'
import { __, assoc, tap } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  arweaveTx: z.object({
    id: z.string(),
    timestamp: z.number()
  }).passthrough()
}).passthrough()

export function writeMessageTxExternalWith (env) {
  let { logger, writeDataItemArweave } = env

  writeDataItemArweave = fromPromise(writeDataItemArweave)

  return (ctx) => {
    return of()
      .map(tap(() => ctx.tracer.trace('Sending message to Arweave')))
      .chain(() =>
        writeDataItemArweave(ctx.tx.data)
      )
      .map(assoc('arweaveTx', __, ctx))
      /**
       * Make sure to add the message's id
       * to the trace of the parent message
       */
      .map(tap(ctx => ctx.tracer.child(ctx.tx.id)))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "arweaveTx" to ctx'))
      .bimap(
        tap(() => ctx.tracer.trace('Failed to send message to Arweave')),
        tap(() => ctx.tracer.trace('Sent message to Arweave'))
      )
  }
}
