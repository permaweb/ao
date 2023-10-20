import { of } from 'hyper-async'

import { verifyProcessWith } from './verify-process.js'
import { uploadMessageWith } from './upload-message.js'

/**
 * @typedef Env1
 *
 * @typedef WriteMessageArgs
 * @property {string} processId
 * @property {string} anchor
 * @property {{ name: string, value: string }[]} [tags]
 * @property {any} signer
 *
 * @callback WriteMessage
 * @param {WriteMessageArgs} args
 * @returns {Promise<string>} the id of the data item that represents this message
 *
 * @param {Env1} - the environment
 * @returns {WriteMessage}
 */
export function writeMessageWith (env) {
  const verifyProcess = verifyProcessWith(env)
  const uploadMessage = uploadMessageWith(env)

  return ({ processId, tags, anchor, signer }) => {
    return of({ id: processId, tags, anchor, signer })
      .chain(verifyProcess)
      .chain(uploadMessage)
      .map((ctx) => ctx.messageId) // the id of the data item
      .toPromise()
  }
}
