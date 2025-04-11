import { identity, omit, keys } from 'ramda'
import { z } from 'zod'
import { fromPromise, of } from 'hyper-async'

import { errFrom } from '../utils.js'

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

  const signer = env.signer
  const device = env.device
  const method = env.method

  const mode = env.MODE

  /**
if mode == 'legacy' then request should create an ans-104 from fields
if mode == 'relay' then request should create a hybrid ans-104/httpsig from fields
if mode == 'process' then request should create a pure httpsig from fields
  */
  const handleFormat = (fields) => {
    if (mode === 'mainnet' && device === 'relay@1.0') {
      const dataItem = {
        target: fields.Target,
        anchor: fields.Anchor ?? '',
        tags: keys(
          omit(
            [
              'Target',
              'Anchor',
              'Data',
              'dryrun',
              'Type',
              'Variant',
              'path',
              'method'
            ],
            fields
          )
        )
          .map(function (key) {
            return { name: key, value: fields[key] }
          }, fields)
          .concat([
            { name: 'Data-Protocol', value: 'ao' },
            { name: 'Type', value: fields.Type ?? 'Message' },
            { name: 'Variant', value: fields.Variant ?? 'ao.N.1' }
          ]),
        data: fields?.data || ''
      }

      let _type = fields.Type ?? 'Message'
      if (fields.dryrun) {
        _type = 'dryrun'
      }
      return {
        type: _type,
        dataItem
      }
    }

    if (mode === 'mainnet') {
      const map = fields

      return {
        type: fields.Type,
        map
      }
    }
  }

  function dispatch ({ request }) {
    return function (ctx) {
      return fromPromise((ctx) => {
        return request(ctx)
      })(ctx)
    }
  }

  const verifyInput = (args) => {
    return of(inputSchema.parse(args))
  }

  const transformToMap = (mode) => (result) => {
    const map = {}
    const res = result
    map.body = res.body 
    res.headers.forEach((v, k) => {
      map[k] = {
        text: () => Promise.resolve(v)
      }
    })

    // if (typeof res.body === 'string') {
    //   try {
    //     body = JSON.parse(res.body)
    //     return { ...map, ...body }
    //   } catch (e) {
    //     map.body = body
    //   }
    // }
    return map
  }

  return (fields) => {
    return (
      of({ path: `/~${device}`, ...fields, method: fields.method ?? method })
        .chain(verifyInput)

        // is the the best place to either call
        // legacy mode just an ANS-104
        // mainnet relay-device = hsig + ans-104
        // mainnet process-device -> hsig
        //.map(handleFormat)
        .chain(dispatch({ request }))

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
