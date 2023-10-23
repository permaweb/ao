import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { assoc, __ } from 'ramda'

const ctxSchema = z.object({
  tx: z.any()
}).passthrough()

export function buildTxWith ({ buildAndSign, logger }) {
  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(() => buildAndSign({
        data: ctx.cachedMsg.data,
        processId: ctx.cachedMsg.target,
        tags: ctx.cachedMsg.tags,
        anchor: ctx.cachedMsg.anchor
      })))
      .map(assoc('tx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added tx to ctx'))
  }
}
