import { of } from 'hyper-async'

import { verifyContractWith } from './verify-contract.js'
import { verifyInputWith } from './verify-input.js'
import { uploadInteractionWith } from './upload-interaction.js'

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
  const uploadInteraction = uploadInteractionWith(env)

  return (contractId, input, signer, tags) => {
    return of({ id: contractId, input, signer, tags })
      .chain(verifyContract)
      .chain(verifyInput)
      .chain(uploadInteraction)
      .map((ctx) => ctx.interactionId)
      .toPromise()
  }
}
