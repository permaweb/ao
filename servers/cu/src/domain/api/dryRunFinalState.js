import { Readable } from 'node:stream'
import { omit, pick } from 'ramda'
import { Rejected, Resolved, of } from 'hyper-async'

import { evaluateWith } from '../lib/evaluate.js'
import { messageSchema } from '../model.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { loadArweaveProcessStateWith } from '../lib/loadArweaveProcessState.js'
import { mapFrom } from '../utils.js'

const TtlCache = ({ setTimeout, clearTimeout }) => {
  const cache = {
    data: new Map(),
    timers: new Map(),
    set: (key, value, ttl) => {
      if (cache.timers.has(key)) clearTimeout(cache.timers.get(key))
      const timer = setTimeout(() => cache.delete(key), ttl)
      timer.unref()
      cache.timers.set(key, timer)
      cache.data.set(key, value)
    },
    get: key => cache.data.get(key),
    delete: key => {
      if (cache.timers.has(key)) clearTimeout(cache.timers.get(key))
      cache.timers.delete(key)
      return cache.data.delete(key)
    }
  }

  return cache
}

const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed; let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/**
 * Evaluate dry-runs directly on the latest trusted Arweave checkpoint.
 * Scheduler messages, including later cron messages, are intentionally not
 * loaded or evaluated in this mode.
 */
export function dryRunFinalStateWith (env) {
  const DRY_RUN_DEFAULT_MAX_PROCESS_AGE = env.DRY_RUN_DEFAULT_MAX_PROCESS_AGE
  const DRY_RUN_RESULT_MAX_AGE = env.DRY_RUN_RESULT_MAX_AGE
  const DRY_RUN_PROCESS_CACHE_TTL = env.DRY_RUN_PROCESS_CACHE_TTL
  const logger = env.logger
  const loadModule = loadModuleWith(env)
  const loadArweaveProcessState = loadArweaveProcessStateWith(env)
  const evaluate = evaluateWith({
    ...env,
    loadEvaluator: env.loadDryRunEvaluator
  })

  const processStateCache = TtlCache(env)
  const dryRunResultCache = TtlCache(env)

  function ensureProcessLoaded ({ maxProcessAge }) {
    return (ctx) => of(ctx)
      .chain((ctx) => {
        const cached = processStateCache.get(ctx.processId)

        if (cached && new Date().getTime() - cached.age <= maxProcessAge) {
          logger.debug(
            'Using recently cached Arweave checkpoint for final-state dry-run to process "%s": "%j"',
            ctx.processId,
            pick(['from', 'ordinate', 'fromBlockHeight', 'fromCron'], cached.ctx)
          )
          return Resolved(cached.ctx)
        }

        return Rejected(ctx)
      })
      .bichain(
        (ctx) => loadArweaveProcessState(ctx)
          .chain(loadModule)
          .map((loaded) => {
            processStateCache.set(
              loaded.id,
              { age: new Date().getTime(), ctx: loaded },
              DRY_RUN_PROCESS_CACHE_TTL
            )
            return loaded
          }),
        Resolved
      )
  }

  return ({ processId, messageTxId, maxProcessAge = DRY_RUN_DEFAULT_MAX_PROCESS_AGE, dryRun }) => {
    if (messageTxId) {
      return Rejected({
        status: 400,
        message: 'The "to" parameter is not supported when DRYRUN_FINAL_STATE=true; dry-runs are evaluated against the latest Arweave checkpoint'
      })
    }

    return of({ processId })
      .chain(ensureProcessLoaded({ maxProcessAge }))
      .chain((ctx) => {
        const dryRunHash = cyrb53(JSON.stringify({
          processId,
          checkpoint: {
            timestamp: ctx.from,
            ordinate: ctx.ordinate,
            cron: ctx.fromCron
          },
          dryRun
        }))
        const cached = dryRunResultCache.get(dryRunHash)
        if (cached && new Date().getTime() - cached.age <= DRY_RUN_RESULT_MAX_AGE) {
          logger.debug(
            'Using recently cached final-state dry-run result for process "%s"',
            processId
          )
          return Resolved({ result: cached.ctx, wasCached: true })
        }

        return of({
          ...ctx,
          stats: {
            startTime: new Date(),
            endTime: undefined,
            messages: { scheduled: 0, cron: 0 }
          }
        })
          .chain((ctx) => {
            async function * dryRunMessage () {
              yield messageSchema.parse({
                noSave: true,
                deepHash: undefined,
                cron: undefined,
                ordinate: ctx.ordinate,
                name: 'Dry Run Message',
                message: {
                  Timestamp: ctx.from,
                  'Block-Height': ctx.fromBlockHeight,
                  Cron: false,
                  Target: processId,
                  ...dryRun,
                  From: mapFrom({ tags: dryRun.Tags, owner: dryRun.Owner }),
                  'Read-Only': true
                },
                AoGlobal: {
                  Process: { Id: processId, Owner: ctx.owner, Tags: ctx.tags },
                  Module: { Id: ctx.moduleId, Owner: ctx.moduleOwner, Tags: ctx.moduleTags }
                }
              })
            }

            return evaluate({ ...ctx, dryRun: true, messages: Readable.from(dryRunMessage()) })
          })
          .map((res) => {
            const omitted = omit(['Memory'], res.output)
            dryRunResultCache.set(
              dryRunHash,
              { age: new Date().getTime(), ctx: omitted },
              DRY_RUN_RESULT_MAX_AGE
            )
            return { result: omitted, wasCached: false }
          })
      })
  }
}
