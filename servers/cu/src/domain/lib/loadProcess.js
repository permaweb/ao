import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { always, identity, isNotNil, mergeRight, omit, pick } from 'ramda'
import { z } from 'zod'

import { findEvaluationSchema, findProcessSchema, loadProcessSchema, locateProcessSchema, saveProcessSchema } from '../dal.js'
import { blockSchema, rawTagSchema } from '../model.js'
import { eqOrIncludes, findRawTag, parseTags, trimSlash } from '../utils.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  /**
   * The url of the SU where the process is located
   */
  suUrl: z.string().min(1),
  /**
   * the signature of the process
   *
   * only nullish for backwards compatibility
   */
  signature: z.string().nullish(),
  /**
     * the data of the process
     *
     * only nullish for backwards compatibility
     */
  data: z.any().nullish(),
  /**
     * The anchor for the process
     */
  anchor: z.string().nullish(),
  /**
   * The wallet address of of the process owner
   */
  owner: z.string().min(1),
  /**
   * The tags on the process
   */
  tags: z.array(rawTagSchema),
  /**
   * The block height and timestamp, according to the SU,
   * that was most recent when this process was spawned
   */
  block: blockSchema,
  /**
   * The most recent result. This could be the most recent
   * cached result, or potentially initial cold start state
   * if no evaluations are cached
   */
  result: z.record(z.any()),
  /**
   * The timestamp for the most recent message evaluated,
   * or undefined, no cached evaluation exists
   *
   * This will be used to subsequently determine which messaged
   * need to be fetched from the SU in order to perform the evaluation
   */
  from: z.coerce.number().nullish(),
  /**
   * The ordinate from the most recent evaluation
   * or undefined, no cached evaluation exists
   */
  ordinate: z.coerce.string().nullish(),
  /**
   * The most recent message block height. This could be from the most recent
   * cached evaluation, or undefined, if no evaluations were cached
   *
   * This will be used to subsequently determine the range of block metadata
   * to fetch from the gateway
   */
  fromBlockHeight: z.coerce.number().nullish(),
  /**
   * The most recent message cron. This could be from the recent cached Cron Message
   * evaluation, or undefined, if no evaluations were cached, or the latest evaluation
   * was not the result of a Cron message
   */
  fromCron: z.string().nullish(),
  /**
   * Whether the evaluation found is the exact evaluation being requested
   */
  exact: z.boolean().default(false)
}).passthrough()

function getProcessMetaWith ({ loadProcess, locateProcess, findProcess, saveProcess, logger }) {
  locateProcess = fromPromise(locateProcessSchema.implement(locateProcess))
  findProcess = fromPromise(findProcessSchema.implement(findProcess))
  saveProcess = fromPromise(saveProcessSchema.implement(saveProcess))
  loadProcess = fromPromise(loadProcessSchema.implement(loadProcess))

  const checkTag = (name, pred, err) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  function maybeCached (processId) {
    return findProcess({ processId })
      /**
       * The process could indeed not be found, or there was some other error
       * fetching from persistence. Regardless, we will fallback to loading from
       * the su
       */
      .bimap(
        logger.tap('Could not find process in db. Loading from chain...'),
        logger.tap('found process in db %j')
      )
      /**
       * Locate the scheduler for the process and attach to context
       */
      .chain((process) =>
        of(process.tags)
          .map((tags) => findRawTag('Scheduler', tags))
          .chain((tag) => tag ? Resolved(tag.value) : Rejected('scheduler tag not found'))
          .chain((schedulerHint) => locateProcess({ processId, schedulerHint }))
          .map(({ url: suUrl }) => [process, trimSlash(suUrl)])
      )
  }

  /**
   * Load the process from the SU, extracting the metadata,
   * and then saving to the db
   */
  function loadFromSu (processId) {
    return locateProcess({ processId })
      .chain(({ url }) =>
        loadProcess({ suUrl: trimSlash(url), processId })
          /**
           * Verify the process by examining the tags
           */
          .chain((ctx) =>
            of(ctx.tags)
              .map(parseTags)
              .chain(checkTag('Data-Protocol', eqOrIncludes('ao'), 'value \'ao\' was not found on process'))
              .chain(checkTag('Type', eqOrIncludes('Process'), 'value \'Process\' was not found on process'))
              .chain(checkTag('Module', isNotNil, 'was not found on process'))
              .map(always({ id: processId, ...ctx }))
              .bimap(
                logger.tap('Verifying process failed: %s'),
                logger.tap('Verified process. Saving to db...')
              )
          )
          /**
           * Attempt to save to the db
           */
          .chain((process) =>
            saveProcess(process)
              .bimap(
                logger.tap('Could not save process to db. Nooping'),
                logger.tap('Saved process')
              )
              .bichain(
                always(Resolved(process)),
                always(Resolved(process))
              )
          )
          .map((process) => [process, trimSlash(url)])
      )
  }

  return (processId) =>
    maybeCached(processId)
      .bichain(
        () => loadFromSu(processId),
        Resolved
      )
      .map(([process, suUrl]) => ({
        suUrl,
        signature: process.signature,
        data: process.data,
        anchor: process.anchor,
        owner: process.owner,
        tags: process.tags,
        block: process.block
      }))
}

function loadLatestEvaluationWith ({ findEvaluation, findProcessMemoryBefore, loadLatestSnapshot, saveLatestProcessMemory, logger }) {
  findEvaluation = fromPromise(findEvaluationSchema.implement(findEvaluation))
  // TODO: wrap in zod schemas to enforce contract
  findProcessMemoryBefore = fromPromise(findProcessMemoryBefore)
  loadLatestSnapshot = fromPromise(loadLatestSnapshot)
  saveLatestProcessMemory = fromPromise(saveLatestProcessMemory)

  function maybeExactEvaluation (ctx) {
    /**
     * We also need the Memory for the evaluation,
     * we need to either fetch from cache or perform an evaluation
     */
    if (ctx.needsMemory) return Rejected(ctx)

    return findEvaluation({
      processId: ctx.id,
      to: ctx.to,
      ordinate: ctx.ordinate,
      cron: ctx.cron
    })
      .map((evaluation) => {
        logger(
          'Exact match to cached evaluation for message to process "%s": %j',
          ctx.id,
          pick(['messageId', 'ordinate', 'cron', 'timestamp', 'blockHeight'], evaluation)
        )

        return {
          result: evaluation.output,
          from: evaluation.timestamp,
          ordinate: evaluation.ordinate,
          fromBlockHeight: evaluation.blockHeight,
          fromCron: evaluation.cron,
          exact: true
        }
      })
      .bimap(() => ctx, identity)
  }

  function maybeCachedMemory (ctx) {
    logger('Checking cache for existing memory to start evaluation "%s"...', ctx.id)

    return findProcessMemoryBefore({
      processId: ctx.id,
      timestamp: ctx.to,
      ordinate: ctx.ordinate,
      cron: ctx.cron,
      omitMemory: false
    })
      .chain((found) => {
        const exact = found.timestamp === ctx.to &&
          found.ordinate === ctx.ordinate &&
          found.cron === ctx.cron

        return of()
          .chain(() => {
            /**
             * Nothing to backfill in-memory cache with,
             * so simply noop
             */
            if (['memory', 'cold_start'].includes(found.src)) return Resolved(found)

            logger(
              'Seeding cache with latest checkpoint found with parameters "%j"',
              omit(['Memory'], found)
            )
            /**
             * Immediatley attempt to save the memory loaded from a checkpoint
             * into the LRU In-memory cache, which will cut
             * down on calls to load checkpoints from arweave (it will load from cache instead)
             */
            return saveLatestProcessMemory({
              processId: ctx.id,
              evalCount: 0,
              /**
               * map found
               */
              Memory: found.Memory,
              moduleId: found.moduleId,
              // messageId: found.messageId,
              timestamp: found.timestamp,
              epoch: found.epoch,
              nonce: found.nonce,
              ordinate: found.ordinate,
              blockHeight: found.blockHeight,
              cron: found.cron
            })
              .bichain(Resolved, Resolved)
              .map(() => found)
          })
          .map(() => ({
            result: {
              Memory: found.Memory
            },
            from: found.timestamp,
            ordinate: found.ordinate,
            fromBlockHeight: found.blockHeight,
            fromCron: found.cron,
            exact
          }))
      })
  }

  return (ctx) => maybeExactEvaluation(ctx)
    .bichain(maybeCachedMemory, Resolved)
}

/**
 * @typedef Args
 * @property {string} id - the id of the process
 *
 * @typedef Result
 * @property {string} id - the id of the process
 * @property {string} owner
 * @property {any} tags
 * @property {{ height: number, timestamp: number }} block
 *
 * @callback LoadProcess
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadProcess}
 */
export function loadProcessWith (env) {
  const logger = env.logger.child('loadProcess')
  env = { ...env, logger }

  const getProcessMeta = getProcessMetaWith(env)
  const loadLatestEvaluation = loadLatestEvaluationWith(env)

  return (ctx) => {
    return of(ctx.id)
      .chain(getProcessMeta)
      // { id, owner, block }
      .map(mergeRight(ctx))
      .chain((ctx) =>
        loadLatestEvaluation(ctx)
        // { Memory, result, from }
          .map(mergeRight(ctx))
          // { id, owner, tags, ..., result, from }
      )
      .map(ctxSchema.parse)
  }
}
