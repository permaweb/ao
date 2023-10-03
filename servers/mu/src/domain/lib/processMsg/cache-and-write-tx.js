import { of, Rejected, Resolved, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  sequencerTx: z.object({
    id: z.string(),
    sortKey: z.string(),
    timestamp: z.number(),
    prevSortKey: z.string()
  })
}).passthrough()

function findAndCacheTxWith ({ cacheTx, logger }) {
  return (tx) => {
    return of(tx)
      .map(assoc('cachedAt', new Date()))
      .map(fromPromise(cacheTx))
      .map(() => tx)
      .map(logger.tap('cached tx'))
  }
}

function findAndWriteSeqTxWith ({ findSequencerTx, writeSequencerTx, logger }) {
  const doFindSequencerTx = fromPromise(findSequencerTx)
  const doWriteSequencerTx = fromPromise(writeSequencerTx)

  const maybeSequencerTx = (tx) => doFindSequencerTx(tx.id)
    .bichain(_ => Resolved(tx), Rejected)

  const writeTx = (tx) => doWriteSequencerTx(tx.data)

  return (tx) => maybeSequencerTx(tx)
    .bichain(Resolved, writeTx)
    .map(logger.tap('wrote tx to sequencer'))
}

export function cacheAndWriteTxWith (env) {
  const { logger } = env

  const findAndCacheTx = findAndCacheTxWith(env)
  const findAndWriteSeqTx = findAndWriteSeqTxWith(env)

  return (ctx) => {
    return of(ctx.tx)
      .chain(findAndCacheTx)
      .chain(findAndWriteSeqTx)
      .map(assoc('sequencerTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "sequencerTx" to ctx'))
  }
}
