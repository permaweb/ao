import { of } from 'hyper-async'
import { assoc, path, reduce } from 'ramda'
import { z } from 'zod'

const transactionSchema = z.object({
  tags: z.array(z.object({
    name: z.string(),
    value: z.string()
  }))
})

const contractTagsSchema = z.object({
  'Contract-Src': z.string().min(
    1,
    { message: 'Contract-Src tag was not present on the transaction' }
  ),
  'App-Name': z.literal('SmartWeaveContract'),
  'App-Version': z.literal('0.3.0')
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
    return loadTransactionMeta(id)
      .map(transactionSchema.parse)
      .map(path(['tags']))
      .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
      .map(contractTagsSchema.parse)
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
 * @callback VerifyContract
 * @param {Context} ctx
 * @returns {Async<Context>}
 *
 * @typedef Env6
 * @property {any} loadTransactionMeta
 *
 * @param {Env6} env
 * @returns {VerifyContract}
 */
export function verifyContractWith (env) {
  const verfiyTags = verfiyTagsWith(env)
  return (ctx) => {
    return of(ctx.id)
      .chain(verfiyTags)
      .map(() => ctx)
  }
}
