import { of } from 'hyper-async'

import { verifyInputsWith } from './verify-inputs.js'
import { uploadContractWith } from './upload-contract.js'

/**
 * @typedef Env1
 * @property {any} loadTransactionMeta
 * @property {any} upload
 *
 * @typedef CreateContractResult
 * @property {string} txId - the id of the newly created contract
 *
 * @callback CreateContract
 * @param {string} srcId
 * @param {Record<string, any>} initialState
 * @param {string} signer
 * @param {any[]} tags
 * @returns {Promise<CreateContractResult>} result
 *
 * @param {Env1} - the environment
 * @returns {CreateContract}
 */
export function createContractWith (env) {
  const verifyInputs = verifyInputsWith(env)
  const uploadContract = uploadContractWith(env)

  return (srcId, initialState, signer, tags) => {
    return of({ srcId, initialState, signer, tags })
      .chain(verifyInputs)
      .chain(uploadContract)
      .map((ctx) => ctx.contractId)
      .toPromise()
  }
}
