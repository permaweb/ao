import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({
  
}).passthrough()

export function deleteMsgDataWith ({ deleteMsg, logger }) {
  return (ctx) => {
    return of(ctx.cachedMsg.id)
      .chain(fromPromise(deleteMsg))
      .map(logger.tap('Deleted msg from database'))
  }
}
