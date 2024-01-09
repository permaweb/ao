import { identity } from 'ramda'
import { of } from 'hyper-async'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { errFrom } from '../utils.js'
import { verifyInputsWith } from './verify-inputs.js'
import { uploadProcessWith } from './upload-process.js'

/**
 * @typedef Env1
 *
 * @typedef SpawnProcessArgs
 * @property {string} module
 * @property {string} scheduler
 * @property {Types['signer']} signer
 * @property {{ name: string, value: string }[]} [tags]
 * @property {string} [data]
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

  return ({ module, scheduler, signer, tags, data }) => {
    return of({ module, scheduler, signer, tags, data })
      .chain(verifyInputs)
      .chain(uploadProcess)
      .map((ctx) => ctx.processId)
      .bimap(errFrom, identity)
      .toPromise()
  }
}
