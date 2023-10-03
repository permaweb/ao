import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { assoc, __ } from 'ramda'

const ctxSchema = z.object({
  tx: z.any()
}).passthrough()

export function buildTxWith ({ buildAndSign, logger }) {
  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(() => buildAndSign(
        ctx.cachedMsg.msg.target,
        {
          function: 'handleMessage',
          message: ctx.cachedMsg.msg.message
        }
      )))
      .map(assoc('tx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added tx to ctx'))
  }
}
