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

  const transformToMap = (mode) => (result) => {
    const map = {}
    if (mode === 'relay@1.0') {
      // console.log('Mainnet (M1) result', result)
      if (typeof result === 'string') {
        return result
      }

      if (result.Output && result.Output.data) {
        map.Output = {
          text: () => Promise.resolve(result.Output.data)
        }
      }
      if (result.Messages) {
        map.Messages = result.Messages.map((m) => {
          const miniMap = {}
          m.Tags.forEach((t) => {
            miniMap[t.name] = {
              text: () => Promise.resolve(t.value)
            }
          })
          miniMap.Data = {
            text: () => Promise.resolve(m.Data),
            json: () => Promise.resolve(JSON.parse(m.Data)),
            binary: () => Promise.resolve(Buffer.from(m.Data))
          }
          miniMap.Target = {
            text: () => Promise.resolve(m.Target)
          }
          miniMap.Anchor = {
            text: () => Promise.resolve(m.Anchor)
          }
          return miniMap
        })
      }
      return map
    } else {
      // console.log('Mainnet (M2) result', result)
      const res = result
      let body = ''
      res.headers.forEach((v, k) => {
        map[k] = {
          text: () => Promise.resolve(v)
        }
      })

      if (typeof res.body === 'string') {
        try {
          body = JSON.parse(res.body)
          return { ...map, ...body }
        } catch (e) {
          // console.log('Mainnet (M2) error', e)
          map.body = body
        }
      }
      // console.log('Mainnet (M2) default reply', map)
      return map
    }
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
      .map(handleFormat(mode, device))
      .chain(dispatch({ request, spawn, message, result, dryrun, signer }))
      .map((_) => {
        logger(
          'Received response from message sent to path "%s"',
          fields?.path ?? '/'
        )
        return _
      })
      .map(transformToMap(device))
      .bimap(errFrom, identity)

    return (
      of({ path: `/~${device}`, ...fields, method: fields.method ?? method })
        .chain(verifyInput)

        // is the the best place to either call
        // legacy mode just an ANS-104
        // mainnet relay-device = hsig + ans-104
        // mainnet process-device -> hsig
        .map(handleFormat)

        .chain(dispatch({ request, spawn, message, result, dryrun }))

        .map((res) => {
          logger(
            'Received response from message sent to path "%s" with res %O',
            fields?.path ?? '/',
            res
          )
          return res
        })
        .map(transformToMap(device))

        .bimap(errFrom, identity)
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
