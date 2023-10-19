import { fromPromise, of } from 'hyper-async'
import { assoc, path, reduce } from 'ramda'
import { z } from 'zod'

import { loadTransactionMetaSchema } from '../../dal.js'

const transactionSchema = z.object({
  tags: z.array(z.object({
    name: z.string(),
    value: z.string()
  }))
})

const processTagsSchema = z.object({
  'Contract-Src': z.string().min(
    1,
    { message: 'Contract-Src tag was not present on the transaction' }
  ),
  'Data-Protocol': z.literal('ao'),
  'ao-type': z.literal('process')
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
  return (id) => {
    return of(id)
      .chain(fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta)))
      .map(transactionSchema.parse)
      .map(path(['tags']))
      .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
      .map(processTagsSchema.parse)
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
