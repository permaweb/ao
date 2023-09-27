import { Rejected, Resolved, of } from 'hyper-async'
import { z } from 'zod'
import { __, assoc, equals, prop, reduce } from 'ramda'

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
 * @property {any} readWallet
 * @property {any} walletExists
 */

function verifySourceWith ({ loadTransactionMeta, logger }) {
  const checkTag = (name, pred) => tags => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}' of value '${tags[name]}' was not valid on contract source`)

  return (srcId) => of(srcId)
    .chain(loadTransactionMeta)
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

function verifyWalletWith ({ walletExists, readWallet }) {
  return (wallet) => of(wallet)
    .chain(walletExists)
    .chain((exists) => exists ? Resolved(wallet) : Rejected('wallet not found'))
    .chain(readWallet)
}

/**
 * @typedef Context
 * @property {string} srcId - the id of the contract source
 * @property {any} initialState - the initial state of the contract
 * @property {string} walletPath - the initial state of the contract
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
  const verifyWallet = verifyWalletWith(env)

  return (ctx) => {
    return of(ctx)
      .chain(ctx => verifySource(ctx.srcId).map(() => ctx))
      .chain(ctx => verifyInitialState(ctx.initialState).map(() => ctx))
      .chain(ctx => verifyWallet(ctx.walletPath))
      .map(assoc('wallet', __, ctx))
      .bimap(
        logger.tap('Error when verify input: %s'),
        logger.tap('Successfully verified inputs and added wallet to ctx')
      )
  }
}
