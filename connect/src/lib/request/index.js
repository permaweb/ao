import { identity } from 'ramda'
import { z } from 'zod'
import { fromPromise, of } from 'hyper-async'

import { errFrom } from '../utils.js'

const inputSchema = z.object({
  path: z.string().min(1, { message: 'path is required' }),
  method: z.string()
}).passthrough()

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

  const device = env.device

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
            anchor: fields.Anchor ?? "",
            tags: omit(['Target', 'Anchor', 'Data', 'dryrun', 'Type', 'Variant' ], fields).map(function (key) {
                return ({name: key, value: fields[key]})
            }, fields)
              .concat([
                {name: 'Data-Protocol', value: 'ao'},
                {name: 'Type', value: fields.Type ?? 'Message' },
                {name: 'Variant', value: fields.Variant ?? 'ao.N.1' }
              ])
            ,
            data: fields?.data || ""
        }

        const _type = fields.Type ?? 'Message'
        if (fields.dryrun) {
            _type = 'dryrun'
        }
        return {
            type: _type,
            dataItem: dataItem
        }
    }

    if (mode === 'mainnet') {
        const map = {
            "Data-Protocol": "ao",
            "Variant": "ao.N.1",
            Device: 'process@1.0',
            Type: fields.Type ?? 'Process',
            "Scheduler-Device": 'scheduler@1.0',
            "Execution-Device": 'genesis-wasm@1.0',
            ...fields
        }
        return {
            type: fields.Type,
            map
        } 
    }
  }

  function dispatch({request, spawn, message, result, dryrun}) {
    return function (ctx) {
        if (ctx.tyoe === 'dryrun' && ctx.dataItem) {
            return fromPromise(ctx => {
                return dryrun({
                    process: ctx.dataItem.Target,
                    anchor: ctx.dataItem.Anchor,
                    tags: ctx.dataItems.tags,
                    data: ctx.datatItem.Data ?? ""
                })
            })(ctx)
        }
        if (ctx.type === 'Message' && ctx.dataItem) {
            return fromPromise(ctx => {
                return message({
                    process: ctx.dataItem.Target,
                    anchor: ctx.dataItem.Anchor,
                    tags: ctx.dataItem.tags,
                    data: ctx.dataItem.Data ?? ""
                })
                .then(id => result({
                    process: ctx.dataItem.Target,
                    message: id
                }))
            })
        }
        if (ctx.type === 'Process' && ctx.dataItem) {
            return fromPromise(ctx => {
                return spawn({
                    tags: ctx.tags,
                    data: ctx.data
                })
            })
        }
        if (ctx.map) {
            return fromPromise(ctx => {
                return request(ctx.map)
            })
            
        }
        return 
    }
  }


  const verifyInput = (args) =>
    of(inputSchema.parse(args))

  return (fields) => {
    return of({...fields, path: `/~${device}`})
      .chain(verifyInput)
      // is the the best place to either call
      // legacy mode just an ANS-104
      // mainnet relay-device = hsig + ans-104
      // mainnet process-device -> hsig
      .map(handleFormat)
      .chain(dispatch({request, spawn, message, result, dryrun }))
      .map((res) => {
        logger('Received response from message sent to path "%s"', fields?.path ?? '/')
        return res
      })
      .bimap(errFrom, identity)
      .toPromise()
  }
}
