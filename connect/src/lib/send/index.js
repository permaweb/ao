import { identity } from 'ramda'
import { z } from 'zod'
import { fromPromise, of } from 'hyper-async'

import { errFrom } from '../utils.js'

const inputSchema = z.object({
  path: z.string().min(1, { message: 'path is required' })
}).passthrough()

/**
 * @callback Send
 * @param {string} path
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {Send}
 */
export function sendWith (env) {
  /**
   * TODO: split into separate modules
   * wrap side effect with schema from dal
   */
  const logger = env.logger
  const send = env.send

  const verifyInput = (args) =>
    of(inputSchema.parse(args))

  return (path, fields) => {
    return of({ ...fields, path })
      .chain(verifyInput)
      .chain(fromPromise(send))
      .map((res) => {
        logger('Received response from message sent to path "%s"', path)
        return res
      })
      .bimap(errFrom, identity)
      .toPromise()
  }
}
