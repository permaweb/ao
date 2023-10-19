import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { __, assoc, concat, defaultTo, propEq, reject } from 'ramda'

import { deployContractSchema, registerContractSchema, signerSchema } from '../../dal.js'

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
 * @property {string} srcId - the id of the transactions that contains the xontract source
 * @property {any} initialState -the initialState of the contract
 * @property {Tag[]} tags
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
      .map(removeTagsByName('ao-type'))
      .map(removeTagsByName('Contract-Src'))
      .map(concat(__, [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'ao-type', value: 'process' },
        { name: 'Contract-Src', value: ctx.srcId },
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
      /**
       * The data does not matter, so we just generate a random value
       */
      .map(() => Math.random().toString().slice(-4))
      .map(assoc('data', __, ctx))
      .map(logger.tap('added pseudo-random data as payload for contract at "data"'))
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
export function uploadContractWith (env) {
  const logger = env.logger.child('uploadContract')
  env = { ...env, logger }

  const buildTags = buildTagsWith(env)
  const buildData = buildDataWith(env)

  const deployContract = deployContractSchema.implement(env.deployContract)
  const registerContract = registerContractSchema.implement(env.registerContract)

  return (ctx) => {
    return of(ctx)
      .chain(buildTags)
      .chain(buildData)
      .chain(fromPromise(({ data, tags, signer }) =>
        deployContract({ data, tags, signer: signerSchema.implement(signer) })
      ))
      .chain(fromPromise(({ contractId }) =>
        registerContract({ contractId })
      ))
      .map(res => assoc('contractId', res.contractId, ctx))
  }
}
