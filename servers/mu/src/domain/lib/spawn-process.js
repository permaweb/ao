import { of, fromPromise, Rejected, Resolved } from 'hyper-async'
import { assoc, is } from 'ramda'
// import z from 'zod'

import { parseTags } from '../utils.js'

// const ctxSchema = z.object({
//   processTx: z.any()
// }).passthrough()

export function spawnProcessWith (env) {
  let { logger, writeDataItem, locateScheduler, locateNoRedirect, buildAndSign } = env

  writeDataItem = fromPromise(writeDataItem)
  locateScheduler = fromPromise(locateScheduler)
  locateNoRedirect = fromPromise(locateNoRedirect)

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

    if (ctx.cachedSpawn.initialTxId) {
      tagsIn.push({ name: 'Pushed-For', value: ctx.cachedSpawn.initialTxId })
    }

    const transformedData = { data: Data, tags: tagsIn }

    return of(transformedData.tags)
      .chain(findSchedulerTag)
      .bichain(
        (_error) => {
          return of(ctx.cachedSpawn.processId)
            .chain(locateNoRedirect)
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
          .map(logger.tap('Added processTx to the ctx '))
      })
  }
}
