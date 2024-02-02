import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { assoc, __ } from 'ramda'

const ctxSchema = z.object({
  tx: z.object({
    id: z.string(),
    data: z.any(),
    processId: z.string()
  })
}).passthrough()

export function buildTxWith ({ buildAndSign, logger }) {
  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(() => {
        const tagsIn = [
          ...ctx.resultMsg.Tags,
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'From-Process', value: ctx.resultMsg.processId }
        ]
        if (ctx.resultMsg.initialTxId) {
          tagsIn.push({ name: 'Cranked-For', value: ctx.resultMsg.initialTxId })
        }
        return buildAndSign({
          processId: ctx.resultMsg.Target,
          tags: tagsIn,
          anchor: ctx.resultMsg.Anchor,
          data: ctx.resultMsg.Data
        })
      }))
      .map(assoc('tx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.info('Added tx to ctx'))
  }
}
