import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { always, applySpec, equals, isNotNil, mergeRight, path, pick } from 'ramda'
import { z } from 'zod'

import { findProcessSchema, loadTransactionMetaSchema, saveProcessSchema } from '../dal.js'
import { parseTags } from './utils.js'
import { rawTagSchema } from '../model.js'

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const ctxSchema = z.object({
  owner: z.string().min(1),
  tags: z.array(rawTagSchema)
}).passthrough()

/**
 * @callback LoadProcessMeta
 * @param {string} id - the id of the process
 * @returns {Async<z.infer<typeof ctxSchema>>}
 *
 * @param {Env} env
 * @returns {LoadProcessMeta}
 */
function getProcessMetaWith ({ loadTransactionMeta, findProcess, saveProcess, logger }) {
  loadTransactionMeta = fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta))
  findProcess = fromPromise(findProcessSchema.implement(findProcess))
  saveProcess = fromPromise(saveProcessSchema.implement(saveProcess))

  const checkTag = (name, pred) => (tags) => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on transaction`)

  /**
   * Load the process from chain, extracting the metadata,
   * and then saving to the db
   */
  function loadFromChain (processId) {
    return loadTransactionMeta(processId)
      .map(pick(['owner', 'tags']))
      .map(applySpec({
        owner: path(['owner', 'address']),
        tags: path(['tags'])
      }))
      /**
       * Verify the process by examining the tags
       */
      .chain(ctx =>
        of(ctx.tags)
          .map(parseTags)
          .chain(checkTag('Data-Protocol', equals('ao')))
          .chain(checkTag('ao-type', equals('process')))
          .chain(checkTag('Contract-Src', isNotNil))
          .bimap(
            logger.tap('Verifying process failed: %s'),
            logger.tap('Verified process. Saving to db...')
          )
          .map(always({ id: processId, ...ctx }))
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
        always(loadFromChain(processId)),
        Resolved
      )
      .map(process => ({
        owner: process.owner,
        tags: process.tags
      }))
}

/**
 * @typedef Args
 * @property {string} id - the id of the contract
 *
 * @typedef Result
 * @property {string} id - the id of the contract
 * @property {ArrayBuffer} src - an array buffer that contains the Contract Wasm Src
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

  return (ctx) => {
    return of(ctx.id)
      .chain(getProcessMeta)
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Loaded process and appended to ctx %j'))
  }
}
