import { of } from 'hyper-async'

import { verifyInputsWith } from './verify-inputs.js'
import { uploadProcessWith } from './upload-process.js'

/**
 * @typedef Env1
 *
 * @typedef CreateProcessArgs
 * @property {string} srcId
 * @property {string} signer
 * @property {{ name: string, value: string }[]} [tags]
 *
 * @callback CreateProcess
 * @param {CreateProcessArgs} args
 * @returns {Promise<string>} the tx id of the newly created process
 *
 * @param {Env1} - the environment
 * @returns {CreateProcess}
 */
export function createProcessWith (env) {
  const verifyInputs = verifyInputsWith(env)
  const uploadProcess = uploadProcessWith(env)

  return ({ srcId, signer, tags }) => {
    return of({ srcId, signer, tags })
      .chain(verifyInputs)
      .chain(uploadProcess)
      .map((ctx) => ctx.processId)
      .toPromise()
  }
}
