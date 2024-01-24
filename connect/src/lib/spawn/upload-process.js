import { fromPromise, of, Resolved } from 'hyper-async'
import { z } from 'zod'
import { __, always, append, assoc, concat, defaultTo, ifElse, pipe, prop } from 'ramda'

import { deployProcessSchema, signerSchema } from '../../dal.js'
import { removeTagsByNameMaybeValue } from '../utils.js'

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
 * @property {string} module - the id of the transactions that contains the xontract source
 * @property {any} initialState -the initialState of the contract
 * @property {Tag[]} tags
 * @property {string | ArrayBuffer} [data]
 *
 * @typedef Env6
 * @property {any} upload
 */

function buildTagsWith () {
  return (ctx) => {
    return of(ctx)
      .map(prop('tags'))
      .map(defaultTo([]))
      .map(removeTagsByNameMaybeValue('Data-Protocol', 'ao'))
      .map(removeTagsByNameMaybeValue('Variant'))
      .map(removeTagsByNameMaybeValue('Type'))
      .map(removeTagsByNameMaybeValue('Module'))
      .map(removeTagsByNameMaybeValue('Scheduler'))
      .map(removeTagsByNameMaybeValue('SDK'))
      .map(concat(__, [
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Variant', value: 'ao.TN.1' },
        { name: 'Type', value: 'Process' },
        { name: 'Module', value: ctx.module },
        { name: 'Scheduler', value: ctx.scheduler },
        { name: 'SDK', value: 'aoconnect' }
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
          /**
           * Since we generate the data value, we know it's Content-Type,
           * so set it on the tags
           */
          .map(
            (ctx) => pipe(
              prop('tags'),
              removeTagsByNameMaybeValue('Content-Type'),
              append({ name: 'Content-Type', value: 'text/plain' }),
              assoc('tags', __, ctx)
            )(ctx)
          )
          .map(logger.tap('added pseudo-random string as process "data"'))
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
