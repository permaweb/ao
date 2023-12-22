import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({

}).passthrough()

export function appendSequencerDataWith ({ logger, fetchSequencerProcess }) {
  return (ctx) => {
    return of(ctx.tx.processId)
      .chain(fromPromise(fetchSequencerProcess))
      .map(assoc('sequencerData', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "sequencerData" to ctx'))
  }
}
