import { Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { __, always, append, assoc, concat, defaultTo, ifElse, pipe, prop, propEq, reject } from 'ramda'

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
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: 'Message' },
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
function buildDataWith ({ logger }) {
  function removeTagsByName (name) {
    return (tags) => reject(propEq(name, 'name'), tags)
  }

  return (ctx) => {
    return of(ctx)
      .chain(ifElse(
        always(ctx.data),
        /**
         * data is provided as input, so do nothing
         */
        () => Resolved(ctx),
        /**
         * Just generate a random value for data
         */
        () => Resolved(Math.random().toString().slice(-4))
          .map(assoc('data', __, ctx))
          /**
           * Since we generate the data value, we know it's Content-Type,
           * so set it on the tags
           */
          .map(
            (ctx) => pipe(
              prop('tags'),
              removeTagsByName('Content-Type'),
              append({ name: 'Content-Type', value: 'text/plain' }),
              assoc('tags', __, ctx)
            )(ctx)
          )
          .map(logger.tap('added pseudo-random string as message "data"'))
      ))
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
