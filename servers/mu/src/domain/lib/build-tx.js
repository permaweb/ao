import { Resolved, fromPromise, of } from 'hyper-async'
import z from 'zod'
import { checkStage } from '../utils.js'
import { buildAndSignSchema, fetchSchedulerProcessSchema, isWalletSchema, locateProcessSchema } from '../dal.js'

/**
 * Checks if a process is a HyperBeam process.
 *
 * @param {Object} processId - The process to check
 * @returns
 */
const isHyperBeamProcessWith = ({
  getIsHyperBeamProcess,
  setIsHyperBeamProcess,
  fetchTransactionDetails
}) => {
  return async (processId) => {
    const cached = await getIsHyperBeamProcess(processId)
    if (cached) return cached
    const process = await fetchTransactionDetails([processId])
      .then(res => res?.data?.transactions?.edges?.[0]?.node)
    if (!process) return false
    const variant = process.tags.find(t => t.name === 'Variant')?.value
    if (!variant) return false
    const isHyperBeam = variant === 'ao.N.1'
    await setIsHyperBeamProcess(processId, isHyperBeam)
    return isHyperBeam
  }
}

const ctxSchema = z.object({
  tx: z.object({
    id: z.string(),
    data: z.any(),
    processId: z.string()
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
    fetchSchedulerProcess,
    isWallet,
    getIsHyperBeamProcess,
    setIsHyperBeamProcess,
    fetchTransactionDetails
  } = env
  locateProcess = fromPromise(locateProcessSchema.implement(locateProcess))
  fetchSchedulerProcess = fromPromise(fetchSchedulerProcessSchema.implement(fetchSchedulerProcess))
  buildAndSign = fromPromise(buildAndSignSchema.implement(buildAndSign))
  isWallet = fromPromise(isWalletSchema.implement(isWallet))

  const isHyperBeamProcess = fromPromise(isHyperBeamProcessWith({ getIsHyperBeamProcess, setIsHyperBeamProcess, fetchTransactionDetails }))
  return (ctx) => {
    if (!checkStage('build-tx')(ctx)) return Resolved(ctx)
    return isWallet(ctx.cachedMsg.processId, ctx.logId)
      .chain(
        (isWalletId) => {
          return locateProcess(ctx.cachedMsg.fromProcessId)
            .chain(
              (fromSchedLocation) => {
                return of()
                  .chain(() => isHyperBeamProcess(ctx.cachedMsg.msg.Target))
                  .chain((isHyperBeam) => {
                    if (isHyperBeam) {
                      const fromProcessSchedData = {
                        tags: ctx.cachedMsg.msg.Tags || [],
                        schedulerType: 'hyperbeam'
                      }
                      if (isWalletId) {
                        return of({ fromProcessSchedData })
                      }
                      return locateProcess(ctx.cachedMsg.processId)
                        .map((schedLocation) => {
                          return {
                            schedLocation,
                            fromProcessSchedData,
                            schedulerType: 'hyperbeam'
                          }
                        })
                    } else {
                      return fetchSchedulerProcess(
                        ctx.cachedMsg.fromProcessId,
                        fromSchedLocation.url,
                        ctx.logId
                      )
                        .map((schedulerResult) => ({
                          fromProcessSchedData: schedulerResult
                        }))
                        .chain(({ fromProcessSchedData }) => {
                          /*
                            If the target is a wallet id we will move
                            on here without setting a schedLocation
                            later in the pipeline this will mean the tx
                            goes straight to Arweave.
                          */
                          if (isWalletId) { return of({ fromProcessSchedData }) }
                          return locateProcess(ctx.cachedMsg.processId)
                            .map((schedLocation) => {
                              return {
                                schedLocation,
                                fromProcessSchedData,
                                schedulerType: 'legacy'
                              }
                            })
                        })
                    }
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
            value: res.fromProcessSchedData.tags.find((t) => t.name === 'Module')?.value ?? ''
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
