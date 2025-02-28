import { Readable } from 'node:stream'
import { omit, pick } from 'ramda'
import { Rejected, Resolved, of } from 'hyper-async'

import { loadMessageMetaWith } from '../lib/loadMessageMeta.js'
import { evaluateWith } from '../lib/evaluate.js'
import { messageSchema } from '../model.js'
import { loadModuleWith } from '../lib/loadModule.js'
import { mapFrom } from '../utils.js'
import { readStateWith } from './readState.js'

const DEFAULT_MAX_PROCESS_AGE = 100
/**
 * TODO: should this be an effect or shared util?
 * just keeping here for sake of locality for now
 */
const TtlCache = ({ setTimeout, clearTimeout }) => {
  const cache = {
    data: new Map(),
    timers: new Map(),
    set: (k, v, ttl) => {
      if (cache.timers.has(k)) clearTimeout(cache.timers.get(k))
      const t = setTimeout(() => cache.delete(k), ttl)
      t.unref()
      cache.timers.set(k, t)
      cache.data.set(k, v)
    },
    get: k => cache.data.get(k),
    has: k => cache.data.has(k),
    delete: k => {
      if (cache.timers.has(k)) clearTimeout(cache.timers.get(k))
      cache.timers.delete(k)
      return cache.data.delete(k)
    },
    clear: () => {
      cache.data.clear()
      for (const v of cache.timers.values()) clearTimeout(v)
      cache.timers.clear()
    }
  }

  return cache
}

/**
 * @typedef Env
 *
 * @typedef Result
 *
 * @typedef ReadResultArgs
 * @property {string} messageUid
 *
 * @callback ReadResult
 * @param {ReadResultArgs} args
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {ReadResult}
 */
export function dryRunWith (env) {
  const logger = env.logger
  const loadMessageMeta = loadMessageMetaWith(env)
  const loadModule = loadModuleWith(env)
  const readState = readStateWith(env)
  /**
   * Evaluate performing the dry-run will utilize a separate
   * evaluator using a separate worker thread pool
   */
  const evaluate = evaluateWith({
    ...env,
    loadEvaluator: env.loadDryRunEvaluator
  })

  const readStateCache = TtlCache(env)

  function loadMessageCtx ({ messageUid, processId }) {
    /**
     * Load the metadata associated with the messageId ie.
     * it's timestamp and ordinate, so readState can evaluate
     * up to that point (if it hasn't already)
     */
    if (messageUid) return loadMessageMeta({ processId, messageUid })

    /**
     * No messageUid provided so evaluate up to latest
     */
    return Resolved({
      processId,
      timestamp: undefined,
      nonce: undefined
    })
  }

  function ensureProcessLoaded ({ maxProcessAge }) {
    return (ctx) => of(ctx)
      .chain((ctx) => {
        /**
         * Check to see whether process memory from a previous readState,
         * executed by a previous dryRun, can be used to perform this dryRun
         */
        const cached = readStateCache.get(ctx.processId)

        if (cached && new Date().getTime() - cached.age <= maxProcessAge) {
          logger.debug(
            'Using recently cached process memory for dry-run to process "%s": "%j"',
            ctx.processId,
            pick(['from', 'ordinate', 'fromBlockHeight', 'fromCron'], cached.ctx)
          )
          return Resolved(cached.ctx)
        }

        return Rejected(ctx)
      })
      .bichain(
        (res) => readState({
          processId: res.processId,
          to: res.timestamp,
          /**
           * The ordinate for a scheduled message is it's nonce
           */
          ordinate: res.nonce && `${res.nonce}`,
          /**
           * We know this is a scheduled message, and so has no
           * associated cron.
           *
           * So we explicitly set cron to undefined, for posterity
           */
          cron: undefined,
          needsOnlyMemory: true
        }).map((res) => {
          const cached = { age: new Date().getTime(), ctx: res }
          /**
           * Cache the readState. Since we are not copying ctx,
           * this should have a fairly minimal footprint, only adding
           * the overhead of maintaining the map, timers, for the specified
           * age
           */
          readStateCache.set(res.id, cached, 2000)
          return res
        }),
        Resolved
      )
  }

  function ensureModuleLoaded (ctx) {
    /**
     * If a cached evaluation was found and immediately returned,
     * then we will have not loaded the module and attached it to ctx.
     *
     * So we check if ctx.module is set, and load the Module if not.
     *
     * This check will prevent us from unnecessarily loading the module
     * from Arweave, twice.
     */
    if (!ctx.moduleId) return loadModule(ctx)

    /**
     * The module was loaded by readState, as part of evaluation,
     * so no need to load it again. Just reuse it
     */
    return Resolved(ctx)
  }

  return ({ processId, messageUid, maxProcessAge = DEFAULT_MAX_PROCESS_AGE, dryRun }) => {
    return of({ processId, messageUid })
      .chain(loadMessageCtx)
      .chain(ensureProcessLoaded({ maxProcessAge }))
      .chain(ensureModuleLoaded)
      /**
       * We've read up to 'to', now inject the dry-run message
       *
       * { id, owner, tags, output: { Memory, Error, Messages, Spawns, Output } }
       */
      .chain((ctx) => {
        async function * dryRunMessage () {
          /**
           * Dry run messages are not signed, and therefore
           * will not have a verifiable Id, Signature, Owner, etc.
           *
           * NOTE:
           * Dry Run messages are not signed, therefore not verifiable.
           *
           * This is generally okay, because dry-run message evaluations
           * are Read-Only and not persisted -- the primary use-case for Dry Run is to enable
           * retrieving a view of a processes state, without having to send a bonafide message.
           *
           * However, we should keep in mind the implications. One implication is that spoofing
           * Owner or other fields on a Dry-Run message (unverifiable context) exposes a way to
           * "poke and prod" a process modules for vulnerabilities.
           */
          yield messageSchema.parse({
            /**
             * Don't save the dryRun message
             */
            noSave: true,
            deepHash: undefined,
            cron: undefined,
            ordinate: ctx.ordinate,
            name: 'Dry Run Message',
            message: {
              /**
               * We default timestamp and block-height using
               * the current evaluation.
               *
               * The Dry-Run message can overwrite them
               */
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

        /**
         * Pass a messages stream to evaluate that only emits the single dry-run
         * message and then completes
         */
        return evaluate({ ...ctx, dryRun: true, messages: Readable.from(dryRunMessage()) })
      })
      .map((res) => omit(['Memory'], res.output))
  }
}
