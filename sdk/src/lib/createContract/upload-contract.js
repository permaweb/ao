import { fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { __, assoc, concat } from 'ramda'

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
  return (ctx) => {
    return of(ctx.tags)
      .map(concat(__, [
        { name: 'App-Name', value: 'SmartWeaveContract' },
        { name: 'App-Version', value: '0.3.0' },
        { name: 'Content-Type', value: 'text/plain' },
        { name: 'Init-State', value: JSON.stringify(ctx.initialState) },
        { name: 'Contract-Src', value: ctx.srcId },
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

  return (ctx) => {
    return of(ctx)
      .chain(buildTags)
      .chain(buildData)
      /**
       * We need to wrap signer since it returns a Promise
       * and is injected by the consumer
       */
      .chain(fromPromise(({ data, tags, signer }) => signer({ data, tags })))
      .chain(env.deployContract)
      .map(res => assoc('contractId', res.id, ctx))
  }
}
