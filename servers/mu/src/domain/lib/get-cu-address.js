import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc, identity } from 'ramda'

const ctxSchema = z.object({
  cuAddress: z.string()
}).passthrough()

export function getCuAddressWith ({ selectNode, logger }) {
  return (ctx) => {
    return of({ processId: ctx.tx.processId, logId: ctx.logId })
      .chain(fromPromise(selectNode))
      .map(assoc('cuAddress', __, ctx))
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        identity
      )
      .map(logger.tap({ log: 'Added cuAddress to ctx' }))
  }
}
