
import { Worker, isMainThread, parentPort } from 'worker_threads';

import { of } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({
  monitorId: z.any()
}).passthrough()


function monitor(savedDataItem) {
    const worker = new Worker('./src/domain/lib/monitorProcess/monitorWorker.js');
    worker.postMessage(savedDataItem);
    return of("asdf");
}


export function monitorWith ({ logger }) {
  return (ctx) => {
    return of(ctx.savedDataItem)
      .chain(monitor)
      .map(assoc('monitorId', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "monitorId" to ctx'))
  }
}
