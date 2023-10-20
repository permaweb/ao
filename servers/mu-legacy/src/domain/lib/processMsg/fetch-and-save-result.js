import { of, fromPromise, Resolved, Rejected } from 'hyper-async'
import z from 'zod'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any()
}).passthrough()

function findMsgsWith ({ findLatestMsgs }) {
  const doFindMsgs = fromPromise(findLatestMsgs)

  const maybeFindMsgs = (ctx) => doFindMsgs({ fromTxId: ctx.tx.id })
    .bichain(
      () => Rejected({ ...ctx, msgs: [], spawns: [] }),
      msgs => Resolved({ ...ctx, msgs, spawns: [] })
    )

  return (ctx) => maybeFindMsgs(ctx)
    .bichain(Rejected, Resolved)
}

function findSpawnsWith ({ findLatestSpawns }) {
  const doFindSpawns = fromPromise(findLatestSpawns)

  const maybeFindSpawns = (ctx) => doFindSpawns({ fromTxId: ctx.tx.id })
    .bichain(
      () => Rejected({ ...ctx, spawns: [] }),
      spawns => Resolved({ ...ctx, spawns })
    )

  return (ctx) => maybeFindSpawns(ctx)
    .bichain(Rejected, Resolved)
}

function cacheResultWith ({ fetchResult, saveMsg, findLatestMsgs, saveSpawn }) {
  const findMsgs = findMsgsWith({ findLatestMsgs })
  const fetchResultAsync = fromPromise(fetchResult)

  const tryFetchAndSave = (ctx) =>
    fetchResultAsync(ctx.cuAddress, ctx.tx.id)
      .chain(fetchedResult => {
        const savePromises = fetchedResult.messages.map(msg => {
          return saveMsg({
            id: Math.floor(Math.random() * 1e18).toString(),
            fromTxId: ctx.tx.id,
            msg,
            cachedAt: new Date()
          })
        })

        const saveSpawnPromises = fetchedResult.spawns.map(spawn => {
          return saveSpawn({
            id: Math.floor(Math.random() * 1e18).toString(),
            fromTxId: ctx.tx.id,
            spawn,
            cachedAt: new Date()
          })
        })

        const allPromises = [...savePromises, ...saveSpawnPromises]

        return fromPromise(() => Promise.all(allPromises))()
      })
      .map(() => ctx)

  return (ctx) => findMsgs(ctx)
    .bichain(tryFetchAndSave, () => Resolved(ctx))
}

export function fetchAndSaveResultWith (env) {
  const { logger } = env

  const fetchAndCacheResult = cacheResultWith(env)
  const findMsgs = findMsgsWith(env)
  const findSpawns = findSpawnsWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(fetchAndCacheResult)
      .chain(findMsgs)
      .chain(findSpawns)
      .bichain(Resolved, Resolved)
      .map(ctxSchema.parse)
      .map(logger.tap('Added "msgs and spawns" to ctx'))
  }
}
