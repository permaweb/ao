import { of, fromPromise } from 'hyper-async'

export function deleteSpawnDataWith ({ deleteSpawn, logger }) {
  return (ctx) => {
    return of(ctx.cachedSpawn.id)
      .chain(fromPromise(deleteSpawn))
      .map(() => ctx)
      .map(logger.tap('Deleted spawn from database'))
  }
}
