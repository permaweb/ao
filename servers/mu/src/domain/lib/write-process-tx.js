import { of, fromPromise, Rejected, Resolved } from 'hyper-async'
import { assoc, defaultTo, is } from 'ramda'
import z from 'zod'

import { parseTags } from '../utils.js'
import { rawSchema, writeDataItemSchema } from '../dal.js'

const ctxSchema = z.object({
  schedulerTx: z.object({
    id: z.string(),
    timestamp: z.number()
  }).passthrough()
}).passthrough()

export function writeProcessTxWith (env) {
  let { logger, writeDataItem, locateScheduler } = env

  writeDataItem = fromPromise(writeDataItemSchema.implement(writeDataItem))
  locateScheduler = fromPromise(rawSchema.implement(locateScheduler))

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
    return of(ctx.dataItem.tags)
      .map(defaultTo([]))
      .chain(findSchedulerTag)
      .chain((schedulerAddress) => {
        return locateScheduler(schedulerAddress)
          .chain(({ url }) => {
            return writeDataItem({
              suUrl: url,
              data: ctx.tx.data.toString('base64'),
              logId: ctx.logId,
              schedulerType: ctx.schedulerType,
              processId: ctx.tx.id,
              id: ctx.dataItem?.id || '',
              tags: ctx.dataItem?.tags || [],
              dataStr: ctx.dataItem?.data || ''
            })
          })
      })
      .map((res) => {
        if (res?.process) {
          ctx.processId = res.process
          ctx.tx.id = res.process
          ctx.tx.processId = res.process
        }
        return assoc('schedulerTx', res, ctx)
      })
      .map(ctxSchema.parse)
      .map(logger.tap({ log: 'Added "schedulerTx" to ctx' }))
  }
}
