import { Resolved, fromPromise, of } from 'hyper-async'
import z from 'zod'
import { checkStage } from '../utils.js'
import { buildAndSignSchema, isWalletSchema, locateProcessSchema } from '../dal.js'
import { tagArraySchema } from '../model.js'

const ctxSchema = z.object({
  tx: z.object({
    id: z.string(),
    data: z.any(),
    processId: z.string(),
    tags: tagArraySchema
  }),
  schedLocation: z.any().nullable(),
  tagAssignments: z.any(),
  schedulerType: z.string().optional()
}).passthrough()

export function buildTxWith (env) {
  let {
    buildAndSign,
    logger,
    locateProcess,
    getProcess,
    isWallet,
    isHyperBeamProcess
  } = env
  locateProcess = fromPromise(locateProcessSchema.implement(locateProcess))
  buildAndSign = fromPromise(buildAndSignSchema.implement(buildAndSign))
  isWallet = fromPromise(isWalletSchema.implement(isWallet))

  return (ctx) => {
    if (!checkStage('build-tx')(ctx)) return Resolved(ctx)
    return isWallet(ctx.cachedMsg.processId, ctx.logId)
      .chain(
        (isWalletId) => {
          return locateProcess(ctx.cachedMsg.fromProcessId)
            .chain((fromSchedLocation) => {
              return of()
                .chain(fromPromise(async () => {
                  const isHyperBeam = await isHyperBeamProcess(ctx.cachedMsg.msg.Target, ctx.logId)
                  const fromProcessData = await getProcess(ctx.cachedMsg.fromProcessId)
                  return { isHyperBeam, fromProcessData }
                }))
                .chain(({ isHyperBeam, fromProcessData }) => {
                  if (isWalletId) {
                    return of({ fromProcessData })
                  }
                  return locateProcess(ctx.cachedMsg.processId)
                    .map((schedLocation) => {
                      return {
                        schedLocation,
                        fromProcessData,
                        schedulerType: isHyperBeam ? 'hyperbeam' : 'legacy'
                      }
                    })
                })
            }
            )
        }
      )
      .map((res) => {
        const tagsIn = [
          ...ctx.cachedMsg.msg.Tags?.filter((tag) => {
            return ![
              'Data-Protocol',
              'Type',
              'From-Process',
              'From-Module',
              'Assignments'
            ].includes(tag.name)
          }) ?? [],
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Message' },
          { name: 'From-Process', value: ctx.cachedMsg.fromProcessId },
          {
            name: 'From-Module',
            value: res.fromProcessData.tags.find((t) => t.name === 'Module')?.value ?? ''
          }
        ]

        if (ctx.cachedMsg.initialTxId) {
          tagsIn.push({ name: 'Pushed-For', value: ctx.cachedMsg.initialTxId })
        }

        const assignmentsTag = ctx.cachedMsg.msg.Tags?.find(tag => tag.name === 'Assignments')
        const tagAssignments = assignmentsTag ? assignmentsTag.value : []

        return {
          tags: tagsIn,
          schedLocation: res.schedLocation,
          tagAssignments,
          schedulerType: res.schedulerType
        }
      })
      .chain(
        ({ tags, schedLocation, tagAssignments, schedulerType }) => buildAndSign({
          processId: ctx.cachedMsg.msg.Target,
          tags,
          anchor: ctx.cachedMsg.msg.Anchor,
          data: ctx.cachedMsg.msg.Data
        })
          .map((tx) => {
            return {
              tx,
              schedLocation,
              tagAssignments: tagAssignments.length > 0 ? [{ Processes: tagAssignments, Message: tx.id }] : [],
              schedulerType
            }
          })
      )
      .map((res) => {
        // add tx and schedLocation to the result, overwrite messageId as txId
        return { ...ctx, ...res, messageId: res.tx.id }
      })
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        logger.tap({ log: 'Added tx and schedLocation to ctx' })
      )
  }
}
