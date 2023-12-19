import { of, fromPromise, Rejected, Resolved } from 'hyper-async'
import { __, assoc, is, tap } from 'ramda'
import z from 'zod'

import { parseTags } from '../../utils.js'

const ctxSchema = z.object({
  processTx: z.any()
}).passthrough()

export function spawnProcessWith (env) {
  let { logger, writeDataItem, locateScheduler } = env

  writeDataItem = fromPromise(writeDataItem)
  locateScheduler = fromPromise(locateScheduler)

  function findSchedulerTag (tags) {
    return of(tags)
      .map(parseTags)
      .chain((tags) => {
        if (!tags.Scheduler) return Rejected('No Scheduler tag found on \'Process\' DataItem')
        if (is(Array, tags.Scheduler)) return Resolved(tags.Scheduler[0])
        return Resolved(tags.Scheduler)
      })
  }

  return (ctx) => {
    ctx.tracer.trace('Constructing message from spawn')
    // const { buildAndSign } = ctx;
    // const { Tags, Data } = ctx.cachedSpawn.spawn

    const transformedData = {}

    return of(transformedData)
      .chain((tData) =>
        of(tData.tags)
          .map(findSchedulerTag)
          .chain((schedulerAddress) => locateScheduler(schedulerAddress))
          .chain(() => Rejected('NOT IMPLEMENTED. Need to transform data'))
          .chain(({ url, data }) => writeDataItem({ suUrl: url, data }))
      )
      .bimap(
        tap(() => ctx.tracer.trace('Failed to write spawn to SU')),
        tap(() => ctx.tracer.trace('Wrote spawn to SU'))
      )
      .bichain(
        (error) => {
          console.error('writeProcessTx failed. Recovering and returning original ctx.', error)
          return of(ctx)
        },
        (result) => {
          return of(result)
            .map(assoc('processTx', __, ctx))
            /**
             * Make sure to add the spawned process id
             * to the trace of the parent message
             */
            .map(tap(ctx => ctx.tracer.spawn(ctx.processTx)))
            .map(ctxSchema.parse)
            .map(logger.tap('Added "processTx" to ctx'))
        }
      )
  }
}
