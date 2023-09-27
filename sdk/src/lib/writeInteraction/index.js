import { of } from 'hyper-async'

import { verifyContractWith } from './verify-contract.js'
import { verifyInputWith } from './verify-input.js'
import { buildTxWith } from './build-tx.js'

/**
 * @typedef Env1
 * @property {any} loadTransactionMeta
 * @property {any} mu
 *
 * @typedef WriteInteractionResult
 * @property {string} originalTxId - the id of the transaction that represents this interaction
 * @property {any} bundlrResponse - bundlr response from the gatewy
 *
 * @callback WriteInteraction
 * @param {string} contractId
 * @param {Record<string, any>} input
 * @param {any} wallet
 * @param {any[]} tags
 * @returns {Promise<WriteInteractionResult>} result
 *
 * @param {Env1} - the environment
 * @returns {WriteInteraction}
 */
export function writeInteractionWith (env) {
  const verifyContract = verifyContractWith(env)
  const verifyInput = verifyInputWith(env)
  const buildTx = buildTxWith(env)

  return (contractId, input, wallet, tags) => {
    return of({ id: contractId, input, wallet, tags })
      .chain(verifyContract) // verify contract (is TX a smart contract)
      .chain(verifyInput) // verify input shape
      .chain(buildTx) // construct interaction to send ie. add tags, etc.
      .chain(env.mu.writeInteraction) // write to the messenger
      .map((ctx) => ctx)
      .toPromise()
  }
}
