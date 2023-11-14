import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({
  
}).passthrough()

export function deleteSpawnDataWith ({ deleteSpawn, logger }) {
  return (ctx) => {
    return of(ctx.cachedSpawn.id)
      .chain(fromPromise(deleteSpawn))
      .map(logger.tap('Deleted spawn from database'))
  }
}
