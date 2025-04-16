import { identity } from 'ramda'
import { z } from 'zod'
import { of, Rejected, fromPromise } from 'hyper-async'
import { errFrom } from '../utils.js'

/**
 * @callback Request
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {Request}
 */
export function requestWith (env) {

  return (fields) => {
      return (
        of({ path: `/~${fields.device ?? env.device}`, ...fields, method: fields.method ?? method })
          .chain(verifyInput)

          // is the the best place to either call
          // legacy mode just an ANS-104
          // mainnet relay-device = hsig + ans-104
          // mainnet process-device -> hsig
          //.map(handleFormat)
          .chain(dispatch(env))

          .map(logResult(env, fields))
          .map(transformToMap)
          .bimap(errFrom, identity)
          .toPromise()
    )
  }
}

// ==== Implementation Details =====
// verifies input properties, must have path and method
function verifyInput (args) {
  const inputSchema = z
    .object({
      path: z.string().min(1, { message: 'path is required' }),
      method: z.string()
    })
    .passthrough()
  return of(inputSchema.parse(args))
}

// transforms http request to a map
function transformToMap (result) {
  // question should we return a js Map to ensure order consistency?
  const map = {}
  const res = result
  map.body = res.body 
  res.headers.forEach((v, k) => {
    map[k] = v 
  })

  return map
}

// dispatchs the request from context to hyperbeam
function dispatch (env) {
  return fromPromise(env.request)
}

// TODO: manage any formating required before sending to hyperBEAM
function handleFormat (fields) {
  const map = fields
/**
if mode == 'legacy' then request should create an ans-104 from fields
if mode == 'relay' then request should create a hybrid ans-104/httpsig from fields
if mode == 'process' then request should create a pure httpsig from fields
*/
  return {
    type: fields.Type,
    map
  }
}

function logResult(env, fields) {
  return (res) => {
    env.logger(
      'Received response from message sent to path "%s" with res %O',
      fields?.path ?? '/',
      res
    )
    return res
  }
}
