import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc, tap } from 'ramda'

const ctxSchema = z.object({
  cuAddress: z.string()
}).passthrough()

export function getCuAddressWith ({ selectNode, logger }) {
  return (ctx) => {
    return of(ctx.tx.processId)
      .map(tap(() => ctx.tracer.trace('Resolving CU Address to read result of message')))
      .chain(fromPromise(selectNode))
      .map(assoc('cuAddress', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "cuAddress" to ctx'))
      .bimap(
        tap(() => ctx.tracer.trace('Failed to resolve CU Address')),
        tap(() => ctx.tracer.trace('Resolved CU Address'))
      )
  }
}
