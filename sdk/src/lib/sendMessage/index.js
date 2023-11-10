import { identity } from 'ramda'
import { of } from 'hyper-async'

import { errFrom } from '../utils.js'
import { verifyProcessWith } from './verify-process.js'
import { uploadMessageWith } from './upload-message.js'

/**
 * @typedef Env1
 *
 * @typedef SendMessageArgs
 * @property {string} processId
 * @property {string} [anchor]
 * @property {{ name: string, value: string }[]} [tags]
 * @property {any} signer
 *
 * @callback SendMessage
 * @param {SendMessageArgs} args
 * @returns {Promise<string>} the id of the data item that represents this message
 *
 * @param {Env1} - the environment
 * @returns {SendMessage}
 */
export function sendMessageWith (env) {
  const verifyProcess = verifyProcessWith(env)
  const uploadMessage = uploadMessageWith(env)

  return ({ processId, tags, anchor, signer }) => {
    return of({ id: processId, tags, anchor, signer })
      .chain(verifyProcess)
      .chain(uploadMessage)
      .map((ctx) => ctx.messageId) // the id of the data item
      .bimap(errFrom, identity)
      .toPromise()
  }
}
