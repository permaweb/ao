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
  const message = env.message
  const result = env.result
  const dryrun = env.dryrun
  const spawn = env.spawn

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

  function dispatch ({ request, spawn, message, result, dryrun }) {
    return function (ctx) {
      if (ctx.type === 'dryrun' && ctx.dataItem) {
        const inputData = {
          process: ctx.dataItem.target,
          anchor: ctx.dataItem.anchor,
          tags: ctx.dataItem.tags,
          data: ctx.datatItem?.data ?? ''
        }
        return fromPromise(() =>
          dryrun(inputData).catch((err) => {
            if (err.message.includes('Insufficient funds')) {
              return { error: 'insufficient-funds' }
            }
            throw err
          })
        )(ctx)
      }

      if (ctx.type === 'Message' && ctx.dataItem) {
        return fromPromise((ctx) =>
          message({
            process: ctx.dataItem.target,
            anchor: ctx.dataItem.anchor,
            tags: ctx.dataItem.tags,
            data: ctx.dataItem.data ?? '',
            signer
          })
            .then((id) =>
              result({
                process: ctx.dataItem.target,
                message: id
              })
            )
            .catch((err) => {
              if (err.message.includes('Insufficient funds')) {
                return { error: 'insufficient-funds' }
              }
              throw err
            })
        )(ctx)
      }
      if (ctx.type === 'Process' && ctx.dataItem) {
        return fromPromise((ctx) =>
          spawn({
            tags: ctx.dataItem.tags,
            data: ctx.dataItem.data,
            scheduler: ctx.dataItem.tags.find((t) => t.name === 'Scheduler')
              ?.value,
            module: ctx.dataItem.tags.find((t) => t.name === 'Module')?.value,
            signer
          })
            // .then(id => result({
            //     process: id,
            //     message: id
            // }))
            .catch((err) => {
              if (err.message.includes('Insufficient funds')) {
                return { error: 'insufficient-funds' }
              }
              throw err
            })
        )(ctx)
      }
      if (ctx.map) {
        return fromPromise((ctx) => {
          return request(ctx.map)
        })(ctx)
      }
    }
  }

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
            'Received response from message sent to path "%s"',
            fields?.path ?? '/'
          )
          return res
        })
        .map(transformToMap(device))

        .bimap(errFrom, identity)
        .toPromise()
    )
  }
}
