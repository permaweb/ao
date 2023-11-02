import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { __, assoc } from 'ramda'

// TODO: remove this we have the data on the sequencer

const ctxSchema = z.object({
   
}).passthrough()

export function appendGatewayDataWith({ logger, fetchGatewayProcess }) {
  return (ctx) => {
    return of(ctx.tx.processId)
      .chain(fromPromise(fetchGatewayProcess))
      .map(assoc('gatewayData', __, ctx))
      .map((updatedCtx) => {
        const scheduledIntervalObj = updatedCtx.gatewayData.node.tags.find(obj => obj.name === 'Scheduled-Interval');
        if(scheduledIntervalObj) {
          updatedCtx.tx["interval"] = scheduledIntervalObj.value;
        }
        return updatedCtx;
      })
      .map(ctxSchema.parse)
      .map(logger.tap('Added "gatewayData" to ctx'));
  };
}