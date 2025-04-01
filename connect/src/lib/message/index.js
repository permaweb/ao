import { identity } from 'ramda'
import { of } from 'hyper-async'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { errFrom } from '../utils.js'
import { prepareMessageWith, sendSignedMessageWith, uploadMessageWith } from './upload-message.js'

/**
 * @typedef Env1
 *
 * @typedef SendMessageArgs
 * @property {string} process
 * @property {string} [data]
 * @property {{ name: string, value: string }[]} [tags]
 * @property {string} [anchor]
 * @property {Types['signer']} [signer]
 *
 * @callback SendMessage
 * @param {SendMessageArgs} args
 * @returns {Promise<string>} the id of the data item that represents this message
 *
 * @param {Env1} - the environment
 * @returns {SendMessage}
 */
export function messageWith (env) {
  const uploadMessage = uploadMessageWith(env)

  return ({ process, data, tags, anchor, signer }) => {
    return of({ id: process, data, tags, anchor, signer })
      .chain(uploadMessage)
      .map((ctx) => ctx.messageId)
      .bimap(errFrom, identity)
      .toPromise()
  }
}

export function prepareWith (env) {
  const prepareMessage = prepareMessageWith(env)

  return ({ process, data, tags, anchor, signer }) => {
    return of({ id: process, data, tags, anchor, signer })
      .chain(prepareMessage)
      .map((ctx) => ctx)
      .bimap(errFrom, identity)
      .toPromise()
  }
}

export function signedMessageWith (env) {
  const sendSignedMessage = sendSignedMessageWith(env)

  return ({ id, raw }) => {
    return of({ id, raw })
      .chain(sendSignedMessage)
      .map((ctx) => ctx.messageId)
      .bimap(errFrom, identity)
      .toPromise()
  }
}
