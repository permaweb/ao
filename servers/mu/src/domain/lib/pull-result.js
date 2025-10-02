import { of, fromPromise, Resolved, Rejected } from 'hyper-async'
import { path } from 'ramda'
import z from 'zod'
import { backoff, checkStage, okRes } from '../utils.js'
import { resultSchema } from '../dal.js'

const ctxSchema = z.object({
  msgs: z.any(),
  spawns: z.any(),
  assigns: z.any(),
  initialTxId: z.any()
}).passthrough()

function fetchResultWith ({ logger, fetchResult, fetchHyperBeamResult, fetchHBProcesses }) {
  const fetchResultAsync = fromPromise(resultSchema.implement(fetchResult))
  const fetchHyperBeamResultAsync = fetchHyperBeamResult ? fromPromise(fetchHyperBeamResult) : null

  function getAssignmentNum ({ suUrl, messageId, processId }) {
    return backoff(
      () => fetch(`${suUrl}/${messageId}?process-id=${processId}`, { method: 'GET' })
        .then(okRes)
        .then((res) => res.json())
        .then(path(['assignment', 'tags']))
        .then((tags) => {
          return tags.find((tag) => tag.name.toLowerCase() === 'nonce')?.value
        })
        .then(parseInt),
      { maxRetries: 3, delay: 500, log: logger, name: `getAssignmentNum(${JSON.stringify({ suUrl, messageId, processId })})` }
    )
  }

  return (ctx) => {
    let { HB_PROCESSES } = fetchHBProcesses ? fetchHBProcesses() : {}
    return of(ctx)
      .chain(() => {
        if (
          HB_PROCESSES[ctx.tx?.processId] && 
          ctx.schedulerType !== 'hyperbeam' && 
          fetchHyperBeamResultAsync 
        ) {
          console.log('zzzzz')
          const messageId = ctx.tx?.id
          return fromPromise(getAssignmentNum)({ suUrl: ctx.schedLocation?.url, messageId, processId: ctx.tx.processId })
            .chain((assignmentNum) => {
              if (!assignmentNum || isNaN(assignmentNum)) {
                return Rejected(new Error('Assignment number not found', { cause: ctx }))
              }

              return fetchHyperBeamResultAsync({
                processId: ctx.tx.processId,
                assignmentNum,
                logId: ctx.logId
              })
            })
        } else if (ctx.schedulerType === 'hyperbeam' && fetchHyperBeamResultAsync && ctx.schedulerTx?.slot) {
          return fetchHyperBeamResultAsync({
            processId: ctx.tx.processId,
            assignmentNum: ctx.schedulerTx.slot, // Use scheduler tx id as assignment number
            logId: ctx.logId
          })
        } else {
          // Use legacy CU result fetching
          return fetchResultAsync(ctx.tx.id, ctx.tx.processId, ctx.logId, ctx.customCuUrl)
        }
      })
      .chain(fetchedResult => {
        const msgs = fetchedResult.Messages
          .filter(msg =>
            msg.Target !== undefined && msg.Anchor !== undefined && msg.Tags !== undefined
          )
          .map(msg => {
            return {
              msg,
              processId: msg.Target,
              initialTxId: ctx.initialTxId,
              fromProcessId: ctx.tx.processId,
              parentId: ctx.messageId ?? ctx.initialTxId,
              wallet: ctx.wallet ?? ctx.dataItem?.owner
            }
          })

        const spawns = fetchedResult.Spawns.map(spawn => {
          return {
            spawn,
            processId: ctx.tx.processId,
            initialTxId: ctx.initialTxId,
            fromProcessId: ctx.processId,
            parentId: ctx.messageId ?? ctx.initialTxId,
            wallet: ctx.wallet ?? ctx.dataItem?.owner
          }
        })

        /*
          we have to concat on any assignments that
          come from the Assignments tag, so they get
          returned in the final result and picked up
          by the crank
        */
        const assigns = ctx.tagAssignments
          ? fetchedResult.Assignments
            .concat(ctx.tagAssignments)
          : fetchedResult.Assignments

        return of({ ...ctx, msgs, spawns, assigns })
      })
      .toPromise()
  }
}

export function pullResultWith (env) {
  const { logger } = env

  const fetchResult = fetchResultWith(env)

  return (ctx) => {
    if (!checkStage('pull-result')(ctx) && !checkStage('pull-initial-result')(ctx)) return Resolved(ctx)
    return of(ctx)
      .map((ctx) => ({ ...ctx, tx: ctx.tx }))
      .chain((ctx) => {
        return of(ctx)
          .chain(fromPromise(fetchResult))
      })
      .map(ctxSchema.parse)
      .bimap(
        (e) => {
          return new Error(e, { cause: ctx })
        },
        logger.tap({ log: 'Added msgs, spawns, and assigns to ctx' })
      )
  }
}
