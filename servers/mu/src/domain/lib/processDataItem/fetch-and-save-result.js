import { of, fromPromise, Resolved } from 'hyper-async'
import { tap } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any()
}).passthrough()

function findMsgsWith ({ findLatestMsgs }) {
  const doFindMsgs = fromPromise(findLatestMsgs)

  const maybeFindMsgs = (ctx) => doFindMsgs({ fromTxId: ctx.tx.id })
    .bichain(
      () => Resolved({ ...ctx, msgs: [], spawns: [] }),
      msgs => Resolved({ ...ctx, msgs, spawns: [] })
    )

  return (ctx) => maybeFindMsgs(ctx)
    .bichain(Resolved, Resolved)
}

function findSpawnsWith ({ findLatestSpawns }) {
  const doFindSpawns = fromPromise(findLatestSpawns)

  const maybeFindSpawns = (ctx) => doFindSpawns({ fromTxId: ctx.tx.id })
    .bichain(
      () => Resolved({ ...ctx, spawns: [] }),
      spawns => Resolved({ ...ctx, spawns })
    )

  return (ctx) => maybeFindSpawns(ctx)
    .bichain(Resolved, Resolved)
}

function cacheResultWith ({ fetchResult, saveMsg, saveSpawn }) {
  const fetchResultAsync = fromPromise(fetchResult)

  const tryFetchAndSave = (ctx) =>
    fetchResultAsync(ctx.tx.id, ctx.tx.processId)
      .chain(fetchedResult => {
        const savePromises = fetchedResult.Messages.map(msg => {
          return saveMsg({
            id: Math.floor(Math.random() * 1e18).toString(),
            fromTxId: ctx.tx.id,
            msg,
            cachedAt: new Date(),
            processId: ctx.tx.processId
          })
            .then(tap(() => ctx.tracer.trace('Cached outbox message')))
            .catch(tap(() => ctx.tracer.trace('Failed to cache outbox message')))
        })

        const saveSpawnPromises = fetchedResult.Spawns.map(spawn => {
          return saveSpawn({
            id: Math.floor(Math.random() * 1e18).toString(),
            fromTxId: ctx.tx.id,
            spawn,
            cachedAt: new Date(),
            processId: ctx.tx.processId
          })
            .then(tap(() => ctx.tracer.trace('Cached spawn')))
            .catch(tap(() => ctx.tracer.trace('Failed to cache spawn')))
        })

        const allPromises = [...savePromises, ...saveSpawnPromises]

        return fromPromise(() => Promise.all(allPromises))()
      })
      .map(() => ctx)

  return (ctx) => tryFetchAndSave(ctx)
}

export function fetchAndSaveResultWith (env) {
  const { logger } = env

  const fetchAndCacheResult = cacheResultWith(env)
  const findMsgs = findMsgsWith(env)
  const findSpawns = findSpawnsWith(env)

  return (ctx) => {
    return of(ctx)
      .map(tap(() => ctx.tracer.trace('Fetching message result from SU')))
      .chain(fetchAndCacheResult)
      .chain(findMsgs)
      .chain(findSpawns)
      .bichain(Resolved, Resolved)
      .map(ctxSchema.parse)
      .map(logger.tap('Added "msgs and spawns" to ctx'))
      .bimap(
        tap(() => ctx.tracer.trace('Failed to fetch and cache message result')),
        tap(() => ctx.tracer.trace('Fetched and cached message result'))
      )
  }
}
