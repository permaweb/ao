import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { always, identity, isNotNil, mergeRight } from 'ramda'
import { z } from 'zod'

import { findProcessSchema, isProcessOwnerSupportedSchema, loadProcessSchema, locateProcessSchema, saveProcessSchema } from '../dal.js'
import { blockSchema, rawTagSchema } from '../model.js'
import { eqOrIncludes, findRawTag, parseTags, trimSlash, addressFrom } from '../utils.js'

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
  block: blockSchema
}).passthrough()

function getProcessMetaWith ({ loadProcess, locateProcess, findProcess, saveProcess, isProcessOwnerSupported, logger }) {
  locateProcess = fromPromise(locateProcessSchema.implement(locateProcess))
  findProcess = fromPromise(findProcessSchema.implement(findProcess))
  saveProcess = fromPromise(saveProcessSchema.implement(saveProcess))
  loadProcess = fromPromise(loadProcessSchema.implement(loadProcess))
  isProcessOwnerSupported = fromPromise(isProcessOwnerSupportedSchema.implement(isProcessOwnerSupported))

  const checkTag = (name, pred, err) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  const checkProcessOwner = (process) => of(process.owner)
    .chain(isProcessOwnerSupported)
    .chain((isSupported) => isSupported
      ? Resolved(process)
      : Rejected({ status: 403, message: `Access denied for process owner ${process.owner}` })
    )

  function maybeCached (processId) {
    return findProcess({ processId })
      /**
       * The process could indeed not be found, or there was some other error
       * fetching from persistence. Regardless, we will fallback to loading from
       * the su
       */
      .bimap(
        logger.tap('Could not find process in db. Loading from chain...'),
        identity
        // logger.tap('found process in db %j')
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
        owner: addressFrom(process.owner),
        tags: process.tags,
        block: process.block
      }))
      .chain(checkProcessOwner)
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
export function loadProcessMetaWith (env) {
  const logger = env.logger.child('loadProcess')
  env = { ...env, logger }

  const getProcessMeta = getProcessMetaWith(env)

  return (ctx) => {
    return of(ctx.id)
      .chain(getProcessMeta)
      // { id, owner, block }
      .map(mergeRight(ctx))
      .map(ctxSchema.parse)
  }
}
