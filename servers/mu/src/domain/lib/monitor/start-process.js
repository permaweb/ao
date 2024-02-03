import { fromPromise, of } from 'hyper-async'
import { __, assoc } from 'ramda'

export function startWith ({ startProcessMonitor }) {
  const start = fromPromise(startProcessMonitor)
  return (ctx) => {
    return of(ctx.tx)
      .map(assoc('id', ctx.tx.processId, __))
      .chain(start)
      .map(() => ctx)
  }
}
