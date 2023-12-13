import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { isNotNil, prop } from 'ramda'

import { loadProcessMetaSchema, locateSchedulerSchema } from '../../dal.js'
import { eqOrIncludes, parseTags } from '../utils.js'

/**
 * @typedef Env5
 * @property {any} loadProcessMeta
 *
 * @callback VerifyTags
 * @param {string} id - contract tx id
 *
 * @param {Env5} env
 * @returns {any} VerifyTags
 */
function verifyProcessTagsWith ({ loadProcessMeta, locateScheduler }) {
  const checkTag = (name, pred, err) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  loadProcessMeta = fromPromise(loadProcessMetaSchema.implement(loadProcessMeta))
  locateScheduler = fromPromise(locateSchedulerSchema.implement(locateScheduler))

  return (id) => {
    return of(id)
      .chain(locateScheduler)
      .chain(({ url }) => loadProcessMeta({ suUrl: url, processId: id }))
      .map(prop('tags'))
      .map(parseTags)
      .chain(checkTag('Data-Protocol', eqOrIncludes('ao'), 'value \'ao\' was not found on process'))
      .chain(checkTag('Type', eqOrIncludes('Process'), 'value \'Process\' was not found on process'))
      .chain(checkTag('Module', isNotNil, 'was not found on process'))
  }
}

/**
 * @typedef Tag2
 * @property {string} name
 * @property {any} value
 *
 * @typedef Context
 * @property {string} id - the transaction id to be verified
 * @property {any} input
 * @property {any} wallet
 * @property {Tag2[]} tags
 *
 * @callback VerifyProcess
 * @param {Context} ctx
 * @returns {Async<Context>}
 *
 * @typedef Env6
 * @property {any} loadProcessMeta
 *
 * @param {Env6} env
 * @returns {VerifyProcess}
 */
export function verifyProcessWith (env) {
  const verifyProcess = verifyProcessTagsWith(env)
  return (ctx) => {
    return of(ctx.id)
      .chain(verifyProcess)
      .map(() => ctx)
  }
}
