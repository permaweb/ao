import { of } from 'hyper-async'
import { z } from 'zod'
import { __, assoc, concat } from 'ramda'

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
      .map(concat(__, [
        { name: 'App-Name', value: 'SmartWeaveAction' },
        { name: 'App-Version', value: '0.3.0' },
        { name: 'Contract', value: ctx.id },
        { name: 'Input', value: JSON.stringify(ctx.input) },
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
export function uploadInteractionWith (env) {
  const buildTags = buildTagsWith(env)
  const buildData = buildDataWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(buildTags)
      .chain(buildData)
      .chain(({ id, data, tags, signer }) => env.deployInteraction({ contractId: id, data, tags, signer }))
      .map(res => assoc('interactionId', res.interactionId, ctx))
  }
}
