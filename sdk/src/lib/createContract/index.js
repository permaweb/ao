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
 * @typedef CreateContractArgs
 * @property {string} srcId
 * @property {Record<string, any>} initialState
 * @property {string} signer
 * @property {{ name: string, value: string }[]} [tags]
 *
 * @callback CreateContract
 * @param {CreateContractArgs} args
 * @returns {Promise<CreateContractResult>} result
 *
 * @param {Env1} - the environment
 * @returns {CreateContract}
 */
export function createContractWith (env) {
  const verifyInputs = verifyInputsWith(env)
  const uploadContract = uploadContractWith(env)

  return ({ srcId, signer, tags }) => {
    return of({ srcId, signer, tags })
      .chain(verifyInputs)
      .chain(uploadContract)
      .map((ctx) => ctx.contractId)
      .toPromise()
  }
}
