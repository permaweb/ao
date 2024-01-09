import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { always, isNotNil, mergeRight, omit } from 'ramda'
import { z } from 'zod'

import { findLatestEvaluationSchema, findProcessSchema, loadProcessSchema, locateSchedulerSchema, saveProcessSchema } from '../dal.js'
import { rawBlockSchema, rawTagSchema } from '../model.js'
import { eqOrIncludes, parseTags, trimSlash } from '../utils.js'

function getProcessMetaWith ({ loadProcess, locateScheduler, findProcess, saveProcess, logger }) {
  locateScheduler = fromPromise(locateSchedulerSchema.implement(locateScheduler))
  findProcess = fromPromise(findProcessSchema.implement(findProcess))
  saveProcess = fromPromise(saveProcessSchema.implement(saveProcess))
  loadProcess = fromPromise(loadProcessSchema.implement(loadProcess))

  const checkTag = (name, pred, err) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  /**
   * Load the process from the SU, extracting the metadata,
   * and then saving to the db
   */
  function loadFromSu (processId) {
    return locateScheduler(processId)
      .chain(({ url }) => loadProcess({ suUrl: trimSlash(url), processId }))
      /**
       * Verify the process by examining the tags
       */
      .chain(ctx =>
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
  }

  return (processId) =>
    findProcess({ processId })
      /**
       * The process could indeed not be found, or there was some other error
       * fetching from persistence. Regardless, we will fallback to loading from
       * the su
       */
      .bimap(
        logger.tap('Could not find process in db. Loading from chain...'),
        logger.tap('found process in db %j')
      )
      .bichain(
        () => loadFromSu(processId),
        Resolved
      )
      .map(process => ({
        owner: process.owner,
        tags: process.tags,
        block: process.block
      }))
}

function loadLatestEvaluationWith ({ findLatestEvaluation, logger }) {
  findLatestEvaluation = fromPromise(findLatestEvaluationSchema.implement(findLatestEvaluation))

  return (ctx) => of(ctx)
    .chain(args => findLatestEvaluation({ processId: args.id, to: args.to })) // 'to' could be undefined
    .bimap(
      (_) => {
        logger('Could not find latest evaluation in db. Starting with initial state of null...')
        return _
      },
      logger.tap('Found previous evaluation in db. Using as state and starting point to load messages')
    )
    .bichain(
      /**
       * Initial Process State
       */
      () => Resolved({
        /**
         * With BiBo, the initial state is simply nothing.
         * It is up to the process to set up it's own initial state
         */
        Memory: null,
        result: {
          Error: undefined,
          Messages: [],
          Output: '',
          Spawns: []
        },
        from: undefined,
        /**
         * No cached evaluation was found, but we still need an ordinate,
         * in case there are Cron messages to generate prior to any scheduled
         * messages existing in the sequence.
         *
         * The important attribute we need is forthe ordinate to be lexicographically
         * sortable.
         *
         * So we use a very small unicode character, as a pseudo-ordinate, which gets
         * us exactly what we need
         */
        ordinate: '^',
        evaluatedAt: undefined
      }),
      /**
       * State from evaluation we found in cache
       */
      (evaluation) => Resolved({
        Memory: evaluation.output.Memory,
        result: omit(['Memory'], evaluation.output),
        from: evaluation.timestamp,
        ordinate: evaluation.ordinate,
        fromBlockHeight: evaluation.blockHeight,
        evaluatedAt: evaluation.evaluatedAt
      })
    )
}

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
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
  block: rawBlockSchema,
  /**
   * The most recent state. This could be the most recent
   * cached buffer, or potentially null if there is no recently
   * cached state
   */
  Memory: z.any().nullable(),
  /**
   * The most recent result. This could be the most recent
   * cached result, or potentially nothing
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
   * When the evaluation record was created in the local db. If the initial state had to be retrieved
   * from Arweave, due to no state being cached in the local db, then this will be undefined.
   */
  evaluatedAt: z.date().nullish()
}).passthrough()

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
      // { Memory, result, from, evaluatedAt }
      .chain(ctx =>
        loadLatestEvaluation(ctx)
          .map(mergeRight(ctx))
          // { id, owner, tags, ..., Memory, result, from, evaluatedAt }
      )
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded process and appended to ctx'))
  }
}
