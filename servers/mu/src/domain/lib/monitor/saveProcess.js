

import { fromPromise, of } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({
    saveId: z.any()
}).passthrough()

export function saveWith ({ logger, saveProcessToMonitor }) {
  const save = fromPromise(saveProcessToMonitor)
  return (ctx) => {
    console.log(ctx.tx)
    return of(ctx.tx)
      .map(assoc("authorized", true, __))
      .map(assoc("lastFromSortKey", null, __))
      .map(assoc("createdAt", Date.now(), __))
      .map(assoc("id", ctx.tx.processId, __))
      .chain(save)
      .map(assoc('savedDataItem', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "savedDataItem" to ctx'))
  }
}