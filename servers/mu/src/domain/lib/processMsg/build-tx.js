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
      .chain(fromPromise(() => buildAndSign({
        processId: ctx.cachedMsg.msg.target,
        tags: [
          ...ctx.cachedMsg.msg.tags,
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'ao-type', value: 'message' },
          { name: 'SDK', value: 'ao' }
        ],
        anchor: ctx.cachedMsg.msg.anchor,
        data: ctx.cachedMsg.msg.data
      })))
      .map(assoc('tx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added tx to ctx'))
  }
}
