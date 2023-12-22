import { of, fromPromise } from 'hyper-async'
import { __, assoc, tap } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  schedulerTx: z.object({
    id: z.string(),
    timestamp: z.number()
  })
}).passthrough()

export function writeMessageTxWith (env) {
  let { logger, writeDataItem, locateProcess } = env

  writeDataItem = fromPromise(writeDataItem)
  locateProcess = fromPromise(locateProcess)

  return (ctx) => {
    return of()
      .map(tap(() => ctx.tracer.trace('Sending message to SU')))
      .chain(() =>
        locateProcess(ctx.tx.processId)
          .chain(({ url }) => writeDataItem({ suUrl: url, data: ctx.tx.data.toString('base64') }))
      )
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
  }
}
