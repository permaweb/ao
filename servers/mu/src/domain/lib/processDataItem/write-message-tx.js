import { of, fromPromise, Rejected } from 'hyper-async'
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
  let { logger, writeDataItem, locateProcess, writeDataItemArweave } = env

  writeDataItem = fromPromise(writeDataItem)
  locateProcess = fromPromise(locateProcess)
  writeDataItemArweave = fromPromise(writeDataItemArweave)

  return (ctx) => {
    console.log('PROCESSTX-ID: ', ctx.tx.processId)
    return of()
      .map(tap(() => ctx.tracer.trace('Sending message to SU or Arweave')))
      .chain(() =>
        locateProcess(ctx.tx.processId)
          .bichain(
            (error) => {
              if (error.name === 'TransactionNotFound' || error.name === 'SchedulerTagNotFound') {
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
              return Rejected(error)
            },
            ({ url }) => {
              return writeDataItem({ suUrl: url, data: ctx.tx.data.toString('base64') })
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
          )
      )
  }
}
