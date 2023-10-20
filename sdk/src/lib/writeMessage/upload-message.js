import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { __, assoc, concat, defaultTo } from 'ramda'

import { deployMessageSchema, signerSchema } from '../../dal.js'

const tagSchema = z.array(z.object({
  name: z.string(),
  value: z.string()
}))

/**
 * @typedef Tag3
 * @property {string} name
 * @property {any} value
 *
 * @typedef Context3
 * @property {string} id - the transaction id to be verified
 * @property {any} input
 * @property {any} wallet
 * @property {Tag3[]} tags
 *
 * @typedef Env6
 * @property {any} mu
 */

/**
 * @callback BuildTags
 * @param {Context3} ctx
 * @returns {Context3}
 *
 * @returns { BuildTags }
 */
function buildTagsWith () {
  return (ctx) => {
    return of(ctx.tags)
      .map(defaultTo([]))
      .map(concat(__, [
        // TODO: where to place the target? aka processId
        // { name: 'Contract', value: ctx.id },
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'ao-type', value: 'message' },
        { name: 'SDK', value: 'ao' }
      ]))
      .map(tagSchema.parse)
      .map(assoc('tags', __, ctx))
  }
}

/**
 * @callback BuildData
 * @param {Context3} ctx
 * @returns {Context3}
 *
 * @returns { BuildData }
 */
function buildDataWith () {
  return (ctx) => {
    return of(ctx)
      .map(() => Math.random().toString().slice(-4))
      .map(assoc('data', __, ctx))
  }
}

/**
 * @callback BuildTx
 * @param {Context3} ctx
 * @returns {Async<Context3>}
 *
 * @param {Env6} env
 * @returns {BuildTx}
 */
export function uploadMessageWith (env) {
  const buildTags = buildTagsWith(env)
  const buildData = buildDataWith(env)

  const deployMessage = deployMessageSchema.implement(env.deployMessage)

  return (ctx) => {
    return of(ctx)
      .chain(buildTags)
      .chain(buildData)
      .chain(fromPromise(({ id, data, tags, anchor, signer }) =>
        deployMessage({ processId: id, data, tags, anchor, signer: signerSchema.implement(signer) })
      ))
      .map(res => assoc('messageId', res.messageId, ctx))
  }
}
