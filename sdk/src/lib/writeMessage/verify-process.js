import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { anyPass, equals, includes, isNotNil, path } from 'ramda'

import { loadProcessMetaSchema } from '../../dal.js'
import { parseTags } from '../utils.js'

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
function verfiyTagsWith ({ loadProcessMeta }) {
  const checkTag = (name, pred) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on contract source`)

  loadProcessMeta = fromPromise(loadProcessMetaSchema.implement(loadProcessMeta))

  return (id) => {
    return of(id)
      .chain(loadProcessMeta)
      .map(path(['tags']))
      .map(parseTags)
      /**
       * The process could implement multiple Data-Protocols,
       * so check in the case of a single value or an array of values
       */
      .chain(checkTag('Data-Protocol', anyPass([equals('ao'), includes('ao')])))
      .chain(checkTag('ao-type', equals('process')))
      .chain(checkTag('Contract-Src', isNotNil))
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
  const verfiyTags = verfiyTagsWith(env)
  return (ctx) => {
    return of(ctx.id)
      .chain(verfiyTags)
      .map(() => ctx)
  }
}
