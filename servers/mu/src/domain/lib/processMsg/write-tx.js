import { of, Rejected, Resolved, fromPromise } from 'hyper-async'
import { __, assoc } from 'ramda'
import z from 'zod'

const ctxSchema = z.object({
  sequencerTx: z.object({
    id: z.string(),
    timestamp: z.number(),
    block: z.number()
  })
}).passthrough()

function findOrWriteSeqTxWith ({ findSequencerTx, writeSequencerTx, logger }) {
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

export function writeTxWith (env) {
  const { logger } = env

  const findOrWriteSeqTx = findOrWriteSeqTxWith(env)

  return (ctx) => {
    return of(ctx.tx)
      .chain(findOrWriteSeqTx)
      .map(assoc('sequencerTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "sequencerTx" to ctx'))
  }
}
