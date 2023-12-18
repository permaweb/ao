import { of, fromPromise } from 'hyper-async'

export function deleteMsgDataWith ({ deleteMsg, logger }) {
  return (ctx) => {
    return of(ctx.cachedMsg.id)
      .chain(fromPromise(deleteMsg))
      .map(() => ctx)
      .map(logger.tap('Deleted msg from database'))
  }
}
