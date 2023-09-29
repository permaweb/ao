import { Rejected, Resolved, fromPromise, of } from 'hyper-async'
import { z } from 'zod'
import { assoc, equals, prop, reduce } from 'ramda'

import { loadTransactionMetaSchema } from '../../dal.js'

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

function verifySourceWith ({ loadTransactionMeta, logger }) {
  const checkTag = (name, pred) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on contract source`)

  return (srcId) => of(srcId)
    .chain(fromPromise(loadTransactionMetaSchema.implement(loadTransactionMeta)))
    .map(prop('tags'))
    .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
    .chain(checkTag('App-Name', equals('SmartWeaveContractSource')))
    .chain(checkTag('Content-Type', equals('application/wasm')))
    .chain(checkTag('Contract-Type', equals('ao')))
    .bimap(
      logger.tap('Verifying contract source failed: %s'),
      logger.tap('Verified contract source')
    )
}

function verifyInitialStateWith () {
  return (initialState) => of(initialState)
    .map(z.record(z.any()).safeParse)
    .chain(({ success }) => success ? Resolved() : Rejected('initialState was not a valid JSON Object'))
}

function verifySignerWith ({ logger }) {
  return (signer) => of(signer)
    .map(logger.tap('Checking for signer'))
    .chain((signer) => signer ? Resolved(signer) : Rejected('signer not found'))
}

/**
 * @typedef Context
 * @property {string} srcId - the id of the contract source
 * @property {any} initialState - the initial state of the contract
 * @property {Function} sign - the initial state of the contract
 * @property {Tag[]} tags - the additional tags to add to the contract
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

  const verifySource = verifySourceWith(env)
  const verifyInitialState = verifyInitialStateWith()
  const verifySigner = verifySignerWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(ctx => verifySource(ctx.srcId).map(() => ctx))
      .chain(ctx => verifyInitialState(ctx.initialState).map(() => ctx))
      .chain(ctx => verifySigner(ctx.signer).map(() => ctx))
      .bimap(
        logger.tap('Error when verify input: %s'),
        logger.tap('Successfully verified inputs')
      )
  }
}
