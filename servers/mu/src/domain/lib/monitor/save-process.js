import { fromPromise, of } from 'hyper-async'
import { __, assoc } from 'ramda'

export function saveWith ({ logger, saveProcessToMonitor }) {
  const save = fromPromise(saveProcessToMonitor)
  return (ctx) => {
    return of(ctx.tx)
      .map(assoc('authorized', true, __))
      .map(assoc('lastFromTimestamp', null, __))
      .map(assoc('processData', ctx.sequencerData, __))
      .map(assoc('createdAt', Date.now(), __))
      .map(assoc('id', ctx.tx.processId, __))
      .chain(save)
      .map(() => ctx)
  }
}
