import { identity } from 'ramda'
import { z } from 'zod'
import { of, Rejected, fromPromise } from 'hyper-async'

import { errFrom } from '../utils.js'
import { transformToMap } from './transform.js'
import { dispatch } from './dispatch.js'
import { handleFormat } from './format.js'

const inputSchema = z
  .object({
    path: z.string().min(1, { message: 'path is required' }),
    method: z.string()
  })
  .passthrough()

/**
 * @callback Request
 * @param {Record<string, any>} fields
 * @returns {Promise<Response>} result
 *
 * @returns {Request}
 */
export function requestWith (env) {
  /**
   * TODO: split into separate modules
   * wrap side effect with schema from dal
   */
  const logger = env.logger
  const request = env.request
  const message = env.message
  const result = env.result
  const dryrun = env.dryrun
  const spawn = env.spawn

  const signer = env.signer
  const device = env.device
  const method = env.method

  const mode = env.MODE

  const verifyInput = (args) => {
    if (args.device === 'relay@1.0' && args.Type === 'Process') {
      return of(
        z
          .object({
            path: z.string().min(1, { message: 'path is required' }),
            method: z.string(),
            Module: z.string(),
            Scheduler: z.string()
          })
          .passthrough()
          .parse(args)
      )
    }
    return of(inputSchema.parse(args))
  }

  return (fields) => {
    const retry = (fn, request, attempts) =>
      fn(request).bichain(err => {
        if (err.name !== 'RedirectRequested') return Rejected(err)
        if (attempts <= 0) return Rejected(err)
        const newRequest = {
          ...request,
          device: err.device
        }
        return retry(fn, newRequest, attempts - 1)
      }, of)

    const operation = (ctx) => verifyInput(ctx)
      .map(handleFormat(mode))
      .chain(dispatch({ request, spawn, message, result, dryrun, signer }))
      .map((_) => {
        logger(
          'Received response from message sent to path "%s"',
          fields?.path ?? '/'
        )
        return _
      })
      // .map(x => (console.log(x.Messages), x))
      // .chain(getResult(request))
      .map(transformToMap(ctx.device))
      .bimap(errFrom, identity)

    return (
      retry(operation, { path: `/~${device}`, device, ...fields, method: fields.method ?? method }, 1)
        .toPromise()
    )
  }
}

/**

*/
// eslint-disable-next-line no-unused-vars
function getResult (request) {
  return (payload) => fromPromise((payload) => {
    const process = payload.headers.get('process')
    const slot = payload.headers.get('slot')
    // return Promise.resolve({slot, process})
    // eslint-disable-next-line no-unused-vars
    return request({
      path: `/${process}/compute&slot+integer=${slot}/results/json`,
      method: 'POST',
      target: process,
      'slot+integer': slot,
      accept: 'application/json'
    })
  })(payload)
}
