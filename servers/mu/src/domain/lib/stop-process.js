import { fromPromise, of } from 'hyper-async'
import { __, assoc } from 'ramda'

export function stopWith ({ stopProcessMonitor }) {
  const stop = fromPromise(stopProcessMonitor)
  return (ctx) => {
    return of(ctx.tx)
      .map(assoc('id', ctx.tx.processId, __))
      .chain(stop)
      .map(() => ctx)
  }
}
