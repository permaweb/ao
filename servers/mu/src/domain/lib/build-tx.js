import { fromPromise, Resolved, Rejected } from 'hyper-async'
import z from 'zod'

const ctxSchema = z.object({
  tx: z.object({
    id: z.string(),
    data: z.any(),
    processId: z.string()
  }),
  schedLocation: z.any().nullable(),
  tagAssignments: z.any()
}).passthrough()

export function buildTxWith (env) {
  let { buildAndSign, logger, locateProcess, fetchSchedulerProcess } = env
  locateProcess = fromPromise(locateProcess)
  fetchSchedulerProcess = fromPromise(fetchSchedulerProcess)
  buildAndSign = fromPromise(buildAndSign)

  return (ctx) => {
    return locateProcess(ctx.cachedMsg.processId)
      .bichain(
        (error) => {
          /*
              If it is one of these errors This means  that it is supposed
              to go directly to Arweave. If it is some other error we need
              to reject.
          */
          if (error.name !== 'TransactionNotFound' && error.name !== 'SchedulerTagNotFound') {
            return Rejected(error)
          }
          return Resolved()
        },
        (scheduler) => {
          /*
            We have a scheduler so return that for
            later use in the pipeline
          */
          return fetchSchedulerProcess(ctx.cachedMsg.processId, scheduler.url)
            .map((schedulerResult) => ({
              schedLocation: scheduler,
              schedData: schedulerResult
            }))
        }
      )
      .map((res) => {
        const tagsIn = [
          ...ctx.cachedMsg.msg.Tags?.filter((tag) => {
            return ![
              'Data-Protocol',
              'Type',
              'Variant',
              'From-Process',
              'From-Module',
              'Assignments'
            ].includes(tag.name)
          }) ?? [],
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'Variant', value: 'ao.TN.1' },
          { name: 'From-Process', value: ctx.cachedMsg.processId },
          {
            name: 'From-Module',
            value: res.schedData.tags.find((t) => t.name === 'Module')?.value ?? ''
          }
        ]
        if (ctx.cachedMsg.initialTxId) {
          tagsIn.push({ name: 'Pushed-For', value: ctx.cachedMsg.initialTxId })
        }
        const assignmentsTag = ctx.cachedMsg.msg.Tags?.find(tag => tag.name === 'Assignments')
        const tagAssignments = assignmentsTag ? assignmentsTag.value : []
        return {
          tags: tagsIn,
          scheduler: res.schedLocation,
          tagAssignments
        }
      })
      .chain(
        ({ tags, schedLocation, tagAssignments }) => buildAndSign({
          processId: ctx.cachedMsg.msg.Target,
          tags,
          anchor: ctx.cachedMsg.msg.Anchor,
          data: ctx.cachedMsg.msg.Data
        })
          .map((tx) => {
            return {
              tx,
              schedLocation,
              tagAssignments: tagAssignments.length > 0 ? [{ Processes: tagAssignments, Message: tx.id }] : []
            }
          })
      )
      .map((res) => {
        // add tx and schedLocation to the result
        return { ...ctx, ...res }
      })
      .map(ctxSchema.parse)
      .map(logger.tap('Added tx and schedLocation to ctx'))
  }
}
