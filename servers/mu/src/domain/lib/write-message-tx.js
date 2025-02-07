import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { __, assoc, T } from 'ramda'
import z from 'zod'
import { checkStage, setStage } from '../utils.js'
import { uploadDataItemSchema, writeDataItemSchema } from '../dal.js'

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
  let { logger, writeDataItem, writeDataItemArweave, topUp, RELAY_MAP } = env

  writeDataItem = fromPromise(writeDataItemSchema.implement(writeDataItem))
  writeDataItemArweave = fromPromise(uploadDataItemSchema.implement(writeDataItemArweave))
  topUp = fromPromise(topUp)

  return (ctx) => {
    /*
      If we have schedLocation write to the scheduler.
      If not write to Arweave
    */

    if (!checkStage('write-message')(ctx)) return Resolved(ctx)

    return of()
      .chain(() => {
        if(RELAY_MAP && Object.keys(RELAY_MAP).includes(ctx.tx.processId)) {
          if(ctx.cachedMsg?.msg?.Tags?.find((t) => t.name === 'Action' && t.value === 'Credit-Notice')) {
            let sender = ctx.cachedMsg?.msg?.Tags?.find((t) => t.name === 'Sender')?.value;
            let amount = ctx.cachedMsg?.msg?.Tags?.find((t) => t.name === 'Quantity')?.value;

            if(!amount || !sender) {
              return Rejected(new Error('Must set Sender and Quantity to top up.', { cause: ctx }))
            }

            if(!Object.keys(RELAY_MAP).includes("ALLOWED_CURRENCIES")) {
              return Rejected(new Error('No allowed currencies configured on this MU.', { cause: ctx }))
            }

            if(!RELAY_MAP["ALLOWED_CURRENCIES"].includes("ALL")) {
              if(!RELAY_MAP["ALLOWED_CURRENCIES"].includes(ctx.cachedMsg.fromProcessId)) {
                return Rejected(new Error('This currency is not supported on this MU.', { cause: ctx }))
              }
            }
            
            return topUp({ctx, relayUrl: RELAY_MAP[ctx.tx.processId].url, amount, recipientProcessId: sender})
              .bimap(
                (e) => {
                  return new Error(e, { cause: { ...ctx, stage: 'write-message' } })
                },
                logger.tap({ log: `Topped up relay id ${ctx.tx.processId}` })
              )
          }
        }
        return Resolved()
      })
      .chain(() => {
        if (ctx.schedLocation) {
          ctx = setStage('write-message', 'write-message-su')(ctx)
    
          if (!checkStage('write-message-su')(ctx)) return Resolved(ctx)
    
          return writeDataItem({ suUrl: ctx.schedLocation.url, data: ctx.tx.data.toString('base64'), logId: ctx.logId })
            .map(assoc('schedulerTx', __, ctx))
            .map(ctxSchema.parse)
            .bimap(
              (e) => {
                return new Error(e, { cause: { ...ctx, stage: 'write-message' } })
              },
              logger.tap({ log: 'Added schedulerTx to ctx' })
            )
        } else {
          ctx = setStage('write-message', 'write-message-arweave')(ctx)
    
          if (!checkStage('write-message-arweave')(ctx)) return Resolved(ctx)
    
          return writeDataItemArweave(ctx.tx.data)
            .map(assoc('arweaveTx', __, ctx))
            .map(ctxSchemaArweave.parse)
            .bimap(
              (e) => {
                return new Error(e, { cause: { ...ctx, stage: 'write-message' } })
              },
              logger.tap({ log: 'Added "arweaveTx" to ctx' })
            )
        }
      })
  }
}