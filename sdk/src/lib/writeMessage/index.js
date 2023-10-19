import { of } from 'hyper-async'

import { verifyProcessWith } from './verify-process.js'
import { verifyInputWith } from './verify-input.js'
import { uploadMessageWith } from './upload-message.js'

/**
 * @typedef Env1
 *
 * @typedef WriteMessageArgs
 * @property {string} processId
 * @property {Record<string, any>} input
 * @property {any} signer
 * @property {{ name: string, value: string }[]} [tags]
 *
 * @callback WriteInteraction
 * @param {WriteMessageArgs} args
 * @returns {Promise<string>} the id of the transaction that represents this message
 *
 * @param {Env1} - the environment
 * @returns {WriteInteraction}
 */
export function writeInteractionWith (env) {
  const verifyProcess = verifyProcessWith(env)
  const verifyInput = verifyInputWith(env)
  const uploadMessage = uploadMessageWith(env)

  return ({ processId, signer, tags }) => {
    return of({ id: processId, signer, tags })
      .chain(verifyProcess)
      .chain(verifyInput)
      .chain(uploadMessage)
      /**
       * TODO: Is this the transaction id, or a sort key?
       */
      .map((ctx) => ctx.messageId)
      .toPromise()
  }
}
