import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { anyPass, equals, includes, isNotNil, path } from 'ramda'
import { z } from 'zod'

import { loadTransactionMetaSchema } from '../../dal.js'
import { parseTags } from '../utils.js'

const transactionSchema = z.object({
  tags: z.array(z.object({
    name: z.string(),
    value: z.string()
  }))
})

/**
 * @typedef Env5
 * @property {any} loadTransactionMeta
 *
 * @callback VerifyTags
 * @param {string} id - contract tx id
 *
 * @param {Env5} env
 * @returns {any} VerifyTags
 */
function verfiyTagsWith ({ loadTransactionMeta }) {
  const checkTag = (name, pred) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on contract source`)

  return (id) => {
    return of(id)
      .chain(fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta)))
      .map(transactionSchema.parse)
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
 * @property {any} loadTransactionMeta
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
