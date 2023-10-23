import { of, Rejected, Resolved, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  sequencerTx: z.object({
    id: z.string(),
    sortKey: z.string(),
    timestamp: z.number(),
    prevSortKey: z.string().nullable()
  })
}).passthrough()

function findAndCacheTxWith ({ cacheTx, logger }) {
  cacheTx = fromPromise(cacheTx)

  return (tx) => {
    return of(tx)
      .map(tx => ({
        id: tx.id,
        processId: tx.processId,
        data: tx.data,
        cachedAt: new Date()
      }))
      .chain((tx) =>
        cacheTx(tx)
          .map(logger.tap('cached tx'))
          .map(() => tx)
      )
  }
}

function findAndWriteSeqTxWith ({ findSequencerTx, writeSequencerTx, logger }) {
  findSequencerTx = fromPromise(findSequencerTx)
  writeSequencerTx = fromPromise(writeSequencerTx)

  const maybeSequencerTx = (tx) => findSequencerTx(tx.id)
    .bichain(_ => Resolved(tx), Rejected)

  return (tx) => maybeSequencerTx(tx)
    .bichain(
      Resolved,
      (tx) => writeSequencerTx(tx.data)
    )
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
