import { identity } from 'ramda'
import { of } from 'hyper-async'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { errFrom } from '../utils.js'
import { verifyProcessWith } from '../verify-process.js'
import { uploadMessageWith } from './upload-message.js'

/**
 * @typedef Env1
 *
 * @typedef SendMessageArgs
 * @property {string} process
 * @property {string} [data]
 * @property {{ name: string, value: string }[]} [tags]
 * @property {string} [anchor]
 * @property {Types['signer']} signer
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
