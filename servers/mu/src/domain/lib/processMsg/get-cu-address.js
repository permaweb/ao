import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({
  cuAddress: z.string()
}).passthrough()

export function getCuAddressWith ({ selectNode, logger }) {
  return (ctx) => {
    return of(ctx.tx.processId)
      .chain(fromPromise(selectNode))
      .map(assoc('cuAddress', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "cuAddress" to ctx'))
  }
}
