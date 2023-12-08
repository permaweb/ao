import { of, fromPromise } from 'hyper-async'
import { __, assoc, tap } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  sequencerTx: z.object({
    id: z.string(),
    timestamp: z.number(),
    block: z.number()
  })
}).passthrough()

export function writeTxWith (env) {
  const { logger, writeSequencerTx } = env

  const writeSequencer = fromPromise(writeSequencerTx)

  return (ctx) => {
    return of(ctx.tx.data)
      .map(tap(() => ctx.tracer.trace('Sending message to SU')))
      .chain(writeSequencer)
      .map(assoc('sequencerTx', __, ctx))
      /**
       * Make sure to add the message's id
       * to the trace of the parent message
       */
      .map(tap(ctx => ctx.tracer.child(ctx.tx.id)))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "sequencerTx" to ctx'))
      .bimap(
        tap(() => ctx.tracer.trace('Failed to send message to SU')),
        tap(() => ctx.tracer.trace('Sent message to SU'))
      )
  }
}
