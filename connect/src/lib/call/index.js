import { identity } from 'ramda'
import { z } from 'zod'
import { fromPromise, of } from 'hyper-async'

import { errFrom } from '../utils.js'

const inputSchema = z.object({
  path: z.string().min(1, { message: 'path is required' })
}).passthrough()

/**
 * @callback Call
 * @param {string} path
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {Call}
 */
export function callWith (env) {
  /**
   * TODO: split into separate modules
   * wrap side effect with schema from dal
   */
  const logger = env.logger
  const call = env.call

  const verifyInput = (args) =>
    of(inputSchema.parse(args))

  return (path, fields) => {
    return of({ ...fields, path })
      .chain(verifyInput)
      .chain(fromPromise(call))
      .map((res) => {
        logger('Received response from message sent to path "%s"', path)
        return res
      })
      .bimap(errFrom, identity)
      .toPromise()
  }
}
