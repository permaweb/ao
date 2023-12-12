import { fromPromise, of, Resolved } from 'hyper-async'
import { z } from 'zod'
import { __, always, assoc, concat, defaultTo, ifElse, propEq, reject } from 'ramda'

import { deployProcessSchema, signerSchema } from '../../dal.js'

const tagSchema = z.array(z.object({
  name: z.string(),
  value: z.string()
}))

/**
 * @typedef Tag
 * @property {string} name
 * @property {any} value
 *
 * @typedef Context3
 * @property {string} moduleId - the id of the transactions that contains the xontract source
 * @property {any} initialState -the initialState of the contract
 * @property {Tag[]} tags
 * @property {string | ArrayBuffer} [data]
 *
 * @typedef Env6
 * @property {any} upload
 */

function buildTagsWith () {
  function removeTagsByName (name) {
    return (tags) => reject(propEq(name, 'name'), tags)
  }

  return (ctx) => {
    return of(ctx.tags)
      .map(defaultTo([]))
      /**
       * Remove any reserved tags, so that the sdk
       * can properly set them
       */
      .map(removeTagsByName('Type'))
      .map(removeTagsByName('Module'))
      .map(concat(__, [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: 'Process' },
        { name: 'Module', value: ctx.moduleId },
        { name: 'Content-Type', value: 'text/plain' },
        { name: 'SDK', value: 'ao' }
      ]))
      .map(tagSchema.parse)
      .map(assoc('tags', __, ctx))
  }
}

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
         * Just generate a random value for data
         */
        () => Resolved(Math.random().toString().slice(-4))
          .map(assoc('data', __, ctx))
          .map(logger.tap('added pseudo-random data as payload for contract at "data"'))
      ))
  }
}

/**
 * @callback UploadContract
 * @param {Context3} ctx
 * @returns {Async<Context3>}
 *
 * @param {Env6} env
 * @returns {UploadContract}
 */
export function uploadProcessWith (env) {
  const logger = env.logger.child('uploadProcess')
  env = { ...env, logger }

  const buildTags = buildTagsWith(env)
  const buildData = buildDataWith(env)

  const deployProcess = deployProcessSchema.implement(env.deployProcess)

  return (ctx) => {
    return of(ctx)
      .chain(buildTags)
      .chain(buildData)
      .chain(fromPromise(({ data, tags, signer }) =>
        deployProcess({ data, tags, signer: signerSchema.implement(signer) })
      ))
      .map(res => assoc('processId', res.processId, ctx))
  }
}
