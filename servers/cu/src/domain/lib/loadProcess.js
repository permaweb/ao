import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { F, T, always, cond, equals, includes, is, isNotNil, mergeRight } from 'ramda'
import { z } from 'zod'

import { findLatestEvaluationSchema, findProcessSchema, loadProcessSchema, saveProcessSchema } from '../dal.js'
import { rawBlockSchema, rawTagSchema } from '../model.js'
import { parseTags } from './utils.js'

function getProcessMetaWith ({ loadProcess, findProcess, saveProcess, logger }) {
  findProcess = fromPromise(findProcessSchema.implement(findProcess))
  saveProcess = fromPromise(saveProcessSchema.implement(saveProcess))
  loadProcess = fromPromise(loadProcessSchema.implement(loadProcess))

  const checkTag = (name, pred) => (tags) => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on transaction`)

  /**
   * Load the process from chain, extracting the metadata,
   * and then saving to the db
   *
   * TODO: could we eventually load all of this from the SU?
   * for now, just loading Block, since that's the only bit that doesn't finalize
   */
  function loadFromChainAndSu (processId) {
    return loadProcess(processId)
      /**
       * Verify the process by examining the tags
       */
      .chain(ctx =>
        of(ctx.tags)
          .map(parseTags)
          /**
           * The process could implement multiple Data-Protocols,
           * so check in the case of a single value or an array of values
           */
          .chain(checkTag('Data-Protocol', cond([
            [is(String), equals('ao')],
            [is(Array), includes('ao')],
            [T, F]
          ])))
          .chain(checkTag('ao-type', equals('process')))
          .chain(checkTag('Contract-Src', isNotNil))
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
      .bimap(
        logger.tap('Could not find process in db. Loading from chain...'),
        logger.tap('found process in db %j')
      )
      .bichain(
        always(loadFromChainAndSu(processId)),
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
      logger.tap('Found previous evaluation in db %j. Using as state and starting point to load messages')
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
        state: null,
        result: {
          error: undefined,
          messages: [],
          output: [],
          spawns: []
        },
        from: undefined,
        evaluatedAt: undefined
      }),
      /**
       * State from evaluation we found in cache
       */
      (evaluation) => Resolved({
        state: evaluation.output.state,
        result: evaluation.output.result,
        from: evaluation.sortKey,
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
  owner: z.string().min(1),
  tags: z.array(rawTagSchema),
  block: rawBlockSchema,
  /**
   * The most recent state. This could be the most recent
   * cached buffer, or potentially null if there is no recently
   * cached state
   */
  state: z.any().nullable(),
  /**
   * The most recent result. This could be the most recent
   * cached result, or potentially nothing
   * if no interactions are cached
   */
  result: z.record(z.any()),
  /**
   * The most recent message sortKey. This could be from the most recent
   * cached evaluation, or undefined, if no evaluations were cached
   *
   * This will be used to subsequently determine which messaged
   * need to be fetched from the SU in order to perform the evaluation
   */
  from: z.coerce.string().optional(),
  /**
   * When the evaluation record was created in the local db. If the initial state had to be retrieved
   * from Arweave, due to no state being cached in the local db, then this will be undefined.
   */
  evaluatedAt: z.date().optional()
}).passthrough()

/**
 * @typedef Args
 * @property {string} id - the id of the contract
 *
 * @typedef Result
 * @property {string} id - the id of the contract
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
      .map(mergeRight(ctx))
      // { state, result, from, evaluatedAt }
      .chain(ctx =>
        loadLatestEvaluation(ctx)
          .map(mergeRight(ctx))
          // { id, owner, ..., state, result, from, evaluatedAt }
      )
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded process and appended to ctx %O'))
  }
}
