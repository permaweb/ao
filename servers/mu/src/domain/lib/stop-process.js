import { fromPromise, of } from 'hyper-async'
import { __, assoc } from 'ramda'
import { killMonitoredProcessSchema } from '../dal.js'

export function stopWith ({ stopProcessMonitor }) {
  const stop = fromPromise(killMonitoredProcessSchema.implement(stopProcessMonitor))
  return (ctx) => {
    return of(ctx.tx)
      .map(assoc('id', ctx.tx.processId, __))
      .chain(stop)
      .map(() => ctx)
  }
}
