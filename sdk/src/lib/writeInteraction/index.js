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
 * @typedef WriteInteractionArgs
 * @property {string} processId
 * @property {Record<string, any>} input
 * @property {any} signer
 * @property {{ name: string, value: string }[]} [tags]
 *
 * @callback WriteInteraction
 * @param {WriteInteractionArgs} args
 * @returns {Promise<WriteInteractionResult>} result
 *
 * @param {Env1} - the environment
 * @returns {WriteInteraction}
 */
export function writeInteractionWith (env) {
  const verifyContract = verifyContractWith(env)
  const verifyInput = verifyInputWith(env)
  const uploadInteraction = uploadInteractionWith(env)

  return ({ processId, input, signer, tags }) => {
    return of({ id: processId, input, signer, tags })
      .chain(verifyContract)
      .chain(verifyInput)
      .chain(uploadInteraction)
      .map((ctx) => ctx.interactionId)
      .toPromise()
  }
}
