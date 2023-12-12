import { identity } from 'ramda'
import { of } from 'hyper-async'

import { errFrom } from '../utils.js'
import { verifyProcessWith } from './verify-process.js'
import { uploadMessageWith } from './upload-message.js'

/**
 * @typedef Env1
 *
 * @typedef SendMessageArgs
 * @property {string} process
 * @property {string | ArrayBuffer} [data]
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
export function messageWith (env) {
  const verifyProcess = verifyProcessWith(env)
  const uploadMessage = uploadMessageWith(env)

  return ({ process, data, tags, anchor, signer }) => {
    return of({ id: process, data, tags, anchor, signer })
      .chain(verifyProcess)
      .chain(uploadMessage)
      .map((ctx) => ctx.messageId) // the id of the data item
      .bimap(errFrom, identity)
      .toPromise()
  }
}
