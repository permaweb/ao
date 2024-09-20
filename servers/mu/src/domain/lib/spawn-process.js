import { of, fromPromise, Rejected, Resolved } from 'hyper-async'
import { assoc, find, identity, is, map, prop, propEq, when } from 'ramda'
// import z from 'zod'

import { checkStage, parseTags } from '../utils.js'
import { fetchSchedulerProcessSchema, locateProcessSchema, rawSchema, writeDataItemSchema } from '../dal.js'

// const ctxSchema = z.object({
//   processTx: z.any()
// }).passthrough()

export function spawnProcessWith (env) {
  let { logger, writeDataItem, locateScheduler, locateNoRedirect, buildAndSign, fetchSchedulerProcess } = env

  fetchSchedulerProcess = fromPromise(fetchSchedulerProcessSchema.implement(fetchSchedulerProcess))
  writeDataItem = fromPromise(writeDataItemSchema.implement(writeDataItem))
  locateScheduler = fromPromise(rawSchema.implement(locateScheduler))
  locateNoRedirect = fromPromise(locateProcessSchema.implement(locateNoRedirect))

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
    if (!checkStage('spawn-process')(ctx)) return Resolved(ctx)
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
                .chain(() => fetchSchedulerProcess(
                  ctx.cachedSpawn.processId,
                  schedulerResult.url,
                  ctx.logId
                ))
                .map((process) => {
                  /**
                   * Grab module Id from SU response
                   */
                  const moduleId = prop('value', find(propEq('Module', 'name'))(process.tags))
                  /**
                   * Replace 'Module', 'From-Module' tags with the module id from SU
                   */
                  const replaceModuleTags = map(
                    when(
                      propEq('From-Module', 'name'),
                      (item) => { item.value = moduleId }
                    )
                  )

                  replaceModuleTags(transformedData.tags)
                  return process
                })
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
                .chain(() => fetchSchedulerProcess(
                  ctx.cachedSpawn.processId,
                  schedulerResult.url,
                  ctx.logId
                ))
                .map((process) => {
                  /**
                   * Grab module Id from SU response
                   */
                  const moduleId = prop('value', find(propEq('Module', 'name'))(process.tags))

                  /**
                   * Replace 'Module', 'From-Module' tags with the module id from SU
                   */
                  const replaceModuleTags = map(
                    when(
                      propEq('From-Module', 'name'),
                      (item) => { item.value = moduleId }
                    )
                  )

                  replaceModuleTags(transformedData.tags)
                  return process
                })
                .chain(
                  fromPromise(() => buildAndSign(transformedData))
                )
                .chain((signedData) => Resolved({ schedulerResult, signedData }))
            })
        })
      .chain(({ schedulerResult, signedData }) => {
        return writeDataItem({ suUrl: schedulerResult.url, data: signedData.data.toString('base64'), logId: ctx.logId })
          .map((result) => { return { id: signedData.id, block: result.block, timestamp: result.timestamp } })
          .map((r) => assoc('processTx', r.id, ctx))
          .map((ctx) => assoc('messageId', ctx.processTx, ctx))
          .map(logger.tap({ log: 'Added processTx to the ctx' }))
      })
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        identity
      )
  }
}
