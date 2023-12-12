import { identity } from 'ramda'
import { of } from 'hyper-async'

import { errFrom } from '../utils.js'
import { verifyInputsWith } from './verify-inputs.js'
import { uploadProcessWith } from './upload-process.js'

/**
 * @typedef Env1
 *
 * @typedef SpawnProcessArgs
 * @property {string} moduleId
 * @property {string} signer
 * @property {{ name: string, value: string }[]} [tags]
 * @property {string | ArrayBuffer} [data]
 *
 * @callback SpawnProcess
 * @param {SpawnProcessArgs} args
 * @returns {Promise<string>} the tx id of the newly created process
 *
 * @param {Env1} - the environment
 * @returns {SpawnProcess}
 */
export function spawnWith (env) {
  const verifyInputs = verifyInputsWith(env)
  const uploadProcess = uploadProcessWith(env)

  return ({ moduleId, signer, tags, data }) => {
    return of({ moduleId, signer, tags, data })
      .chain(verifyInputs)
      .chain(uploadProcess)
      .map((ctx) => ctx.processId)
      .bimap(errFrom, identity)
      .toPromise()
  }
}
