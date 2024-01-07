import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

const ctxSchema = z.object({

}).passthrough()

export function appendSequencerDataWith ({ logger, fetchSequencerProcess, locateProcess }) {
  locateProcess = fromPromise(locateProcess)
  fetchSequencerProcess = fromPromise(fetchSequencerProcess)
  return (ctx) => {
    return of(ctx.tx.processId)
      .chain(locateProcess)
      .chain((schedulerResult) => fetchSequencerProcess(ctx.tx.processId, schedulerResult.url))
      .map(assoc('sequencerData', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added "sequencerData" to ctx'))
  }
}
