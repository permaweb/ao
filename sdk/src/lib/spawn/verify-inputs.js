import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { isNotNil, prop } from 'ramda'

import { loadTransactionMetaSchema, validateSchedulerSchema } from '../../dal.js'
import { eqOrIncludes, parseTags } from '../utils.js'

const checkTag = (name, pred, err) => tags => pred(tags[name])
  ? Resolved(tags)
  : Rejected(`Tag '${name}': ${err}`)

/**
 * @typedef Tag
 * @property {string} name
 * @property {any} value
 *
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the transaction
 * @returns {Async<any>}
 *
 * @typedef Env
 * @property {LoadTransactionMeta} loadTransactionMeta
 * @property {any} logger
 */

function verifyModuleWith ({ loadTransactionMeta, logger }) {
  loadTransactionMeta = fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta))

  return (module) => of(module)
    .chain(loadTransactionMeta)
    .map(prop('tags'))
    .map(parseTags)
    /**
     * Ensure all Module tags required by the specification are set
     */
    .chain(checkTag('Data-Protocol', eqOrIncludes('ao'), 'value \'ao\' was not found on module'))
    .chain(checkTag('Type', eqOrIncludes('Module'), 'value \'Module\' was not found on module'))
    .chain(checkTag('Module-Format', isNotNil, 'was not found on module'))
    .chain(checkTag('Input-Encoding', isNotNil, 'was not found on module'))
    .chain(checkTag('Output-Encoding', isNotNil, 'was not found on module'))
    .bimap(
      logger.tap('Verifying module source failed: %s'),
      logger.tap('Verified module source')
    )
}

function verifySchedulerWith ({ logger, validateScheduler }) {
  validateScheduler = fromPromise(validateSchedulerSchema.implement(validateScheduler))

  return (scheduler) => of(scheduler)
    /**
     * Ensure the provider scheduler wallet actually owns
     * a valid Scheduler-Location record on-chain
     */
    .chain(scheduler =>
      validateScheduler(scheduler)
        .chain(isValid => isValid
          ? Resolved(scheduler)
          : Rejected(`Valid Scheduler-Location owned by ${scheduler} not found`))
    )
    .bimap(
      logger.tap('Verifying scheduler failed: %s'),
      logger.tap('Verified scheduler')
    )
}

function verifySignerWith ({ logger }) {
  return (signer) => of(signer)
    .map(logger.tap('Checking for signer'))
    .chain((signer) => signer ? Resolved(signer) : Rejected('signer not found'))
}

/**
 * @typedef Context
 * @property {string} module - the id of the module source
 * @property {Function} sign - the signer used to sign the process
 * @property {Tag[]} tags - the additional tags to add to the process
 *
 * @typedef Wallet
 * @property {any} wallet - the read wallet
 *
 * @typedef { Context & Wallet } Result
 *
 * @callback VerifyInputs
 * @param {Context} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {VerifyInputs}
 */
export function verifyInputsWith (env) {
  const logger = env.logger.child('verifyInput')
  env = { ...env, logger }

  const verifyModule = verifyModuleWith(env)
  const verifyScheduler = verifySchedulerWith(env)
  const verifySigner = verifySignerWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(ctx => verifyModule(ctx.module).map(() => ctx))
      .chain(ctx => verifyScheduler(ctx.scheduler)).map(() => ctx)
      .chain(ctx => verifySigner(ctx.signer).map(() => ctx))
      .bimap(
        logger.tap('Error when verify input: %s'),
        logger.tap('Successfully verified inputs')
      )
  }
}
