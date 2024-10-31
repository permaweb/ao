import { Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { __, always, assoc, curry, defaultTo, ifElse, pipe, prop } from 'ramda'
import { proto } from '@permaweb/protocol-tag-utils'

import { deployMessageSchema, signerSchema } from '../../dal.js'

const aoProto = proto('ao')
const removeAoProtoByName = curry(aoProto.removeAllByName)
const concatAoProto = curry(aoProto.concat)
const concatUnassoc = curry(aoProto.concatUnassoc)

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
      .map(removeAoProtoByName('Variant'))
      .map(removeAoProtoByName('Type'))
      .map(concatAoProto([
        { name: 'Variant', value: 'ao.TN.1' },
        { name: 'Type', value: 'Message' }
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
  return (ctx) => {
    return of(ctx)
      .chain(ifElse(
        always(ctx.data),
        /**
         * data is provided as input, so do nothing
         */
        () => Resolved(ctx),
        /**
         * No data is provided, so replace with one space
         */
        () => Resolved(' ')
          .map(assoc('data', __, ctx))
          /**
           * Since we generate the data value, we know it's Content-Type,
           * so set it on the tags
           */
          .map(
            (ctx) => pipe(
              prop('tags'),
              concatUnassoc([{ name: 'Content-Type', value: 'text/plain' }]),
              assoc('tags', __, ctx)
            )(ctx)
          )
          .map(logger.tap('added pseudo-random string as message "data"'))
      ))
      .map(
        (ctx) => pipe(
          prop('tags'),
          concatUnassoc([{ name: 'SDK', value: 'aoconnect' }]),
          assoc('tags', __, ctx)
        )(ctx)
      )
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
