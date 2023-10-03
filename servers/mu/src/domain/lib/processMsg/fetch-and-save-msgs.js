import { of, fromPromise, Resolved, Rejected } from 'hyper-async'
import z from 'zod'

const ctxSchema = z.object({
  msgs: z.any()
}).passthrough()

function findMsgsWith ({ findLatestMsgs }) {
  const doFindMsgs = fromPromise(findLatestMsgs)

  const maybeFindMsgs = (ctx) => doFindMsgs({ fromTxId: ctx.tx.id })
    .bichain(
      () => Rejected({ ...ctx, msgs: [] }),
      msgs => Resolved({ ...ctx, msgs })
    )

  return (ctx) => maybeFindMsgs(ctx)
    .bichain(Rejected, Resolved)
}

function cacheMsgsWith ({ fetchMsgs, saveMsg, findLatestMsgs }) {
  const findMsgs = findMsgsWith({ findLatestMsgs })
  const fetchMsgsAsync = fromPromise(fetchMsgs)

  const tryFetchAndSave = (ctx) =>
    fetchMsgsAsync(ctx.cuAddress, ctx.tx.id)
      .chain(fetchedMsgs => {
        const savePromises = fetchedMsgs.map(msg => {
          return saveMsg({
            id: Math.floor(Math.random() * 1e18).toString(),
            fromTxId: ctx.tx.id,
            msg,
            cachedAt: new Date()
          })
        })

        return fromPromise(() => Promise.all(savePromises))()
      })
      .map(() => ctx)

  return (ctx) => findMsgs(ctx)
    .bichain(tryFetchAndSave, () => Resolved(ctx))
}

export function fetchAndSaveMsgsWith (env) {
  const { logger } = env

  const fetchAndCacheMsgs = cacheMsgsWith(env)
  const findMsgs = findMsgsWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(fetchAndCacheMsgs)
      .chain(findMsgs)
      .bichain(Resolved, Resolved)
      .map(ctxSchema.parse)
      .map(logger.tap('Added "msgs" to ctx'))
  }
}
