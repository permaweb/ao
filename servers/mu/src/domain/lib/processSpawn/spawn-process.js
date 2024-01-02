import { of, fromPromise, Rejected, Resolved } from 'hyper-async'
import { assoc, is, tap } from 'ramda'
// import z from 'zod'

import { parseTags } from '../../utils.js'

// const ctxSchema = z.object({
//   processTx: z.any()
// }).passthrough()

export function spawnProcessWith (env) {
  let { logger, writeDataItem, locateScheduler, locateProcess, buildAndSign } = env

  writeDataItem = fromPromise(writeDataItem)
  locateScheduler = fromPromise(locateScheduler)
  locateProcess = fromPromise(locateProcess)

  function findSchedulerTag (tags) {
    return of(tags)
      .map(parseTags)
      .chain((tags) => {
        if (!tags.Scheduler) return Rejected('No Scheduler tag found on \'Process\' DataItem')
        if (is(Array, tags.Scheduler)) return Resolved(tags.Scheduler[0])
        return Resolved(tags.Scheduler)
      })
  }

  function findModuleTag (tags) {
    return of(tags)
      .map(parseTags)
      .chain((tags) => {
        if (!tags.Module) return Rejected('No Module tag found on \'Process\' DataItem')
        if (is(Array, tags.Module)) return Resolved(tags.Module[0])
        return Resolved(tags.Module)
      })
  }

  return (ctx) => {
    ctx.tracer.trace('Constructing message from spawn')
    const { Tags, Data } = ctx.cachedSpawn.spawn

    const tagsIn = Tags.filter(tag => ![
      'Data-Protocol',
      'Type',
      'Variant'
    ].includes(tag.name))

    tagsIn.push({ name: 'Data-Protocol', value: 'ao' })
    tagsIn.push({ name: 'Type', value: 'Process' })
    tagsIn.push({ name: 'Variant', value: 'ao.TN.1' })
    tagsIn.push({ name: 'From-Process', value: ctx.cachedSpawn.processId })

    const transformedData = { data: Data, tags: tagsIn }

    return of(transformedData.tags)
      .chain(findSchedulerTag)
      .bichain(
        (_error) => {
          return of(ctx.cachedSpawn.processId)
            .chain(locateProcess)
            .chain((schedulerResult) => {
              transformedData.tags.push({ name: 'Scheduler', value: schedulerResult.address })
              return of(transformedData.tags)
                .chain(findModuleTag) // just needs to throw an error if not there
                .chain(
                  fromPromise(() => buildAndSign(transformedData))
                )
                .chain((signedData) => Resolved({ schedulerResult, signedData }))
            })
        },
        (schedulerAddress) => {
          return of(schedulerAddress)
            .chain(locateScheduler)
            .chain((schedulerResult) => {
              return of(transformedData.tags)
                .chain(findModuleTag) // just needs to throw an error if not there
                .chain(
                  fromPromise(() => buildAndSign(transformedData))
                )
                .chain((signedData) => Resolved({ schedulerResult, signedData }))
            })
        })
      .chain(({ schedulerResult, signedData }) => {
        return writeDataItem({ suUrl: schedulerResult.url, data: signedData.data.toString('base64') })
          .map((result) => { return { id: signedData.id, block: result.block, timestamp: result.timestamp } })
          .map((r) => assoc('processTx', r.id, ctx))
          .map(tap(ctx => ctx.tracer.spawn(ctx.processTx)))
          .map(logger.tap('Added processTx to the ctx '))
      })
      .bimap(
        tap(() => ctx.tracer.trace('Failed to write spawn to SU')),
        tap(() => ctx.tracer.trace('Wrote spawn to SU'))
      )
  }
}
