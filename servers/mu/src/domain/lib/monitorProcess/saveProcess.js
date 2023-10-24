

import { of } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({
    saveId: z.any()
}).passthrough()


function save(dataItem) {
  const randomId = generateRandomId();
  return of(randomId);
}

function generateRandomId() {
  return Math.random().toString(36).substring(2, 10);
}


export function saveWith ({ logger, saveProcessToMonitor }) {
  return (ctx) => {
    return of(ctx.dataItem)
      .chain(save)
      .map(assoc('savedDataItem', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "savedDataItem" to ctx'))
  }
}
