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
    return of()
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
                  .map(ctxSchemaArweave.parse)
                  .map(logger.tap('Added "arweaveTx" to ctx'))
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
                .map(ctxSchema.parse)
                .map(logger.tap('Added "schedulerTx" to ctx'))
            }
          )
      )
  }
}
