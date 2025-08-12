import { of, fromPromise } from 'hyper-async'
import { assoc } from 'ramda'
import { verifyInputWith } from './verify-input.js'
import { runWith } from './run.js'

/**
 * @typedef Env
 *
 * @typedef DryRunResult
 * @property {any} Output
 * @property {any[]} Messages
 * @property {any[]} Spawns
 * @property {any} [Error]
 *
 * @typedef MessageInput
 * @property {string} process
 * @property {any} [data]
 * @property {{ name: string, value: string }[]} [tags]
 * @property {string} [anchor]
 * @property {string} [Id]
 * @property {string} [Owner]
 *
 * @callback DryRun
 * @param {MessageInput & Object.<string, *>} msg
 * @return {Promise<DryRunResult>}
 *
 * @param {Env} env
 * @returns {DryRun}
 */

export function dryrunWith (env) {
  const verifyInput = verifyInputWith(env)
  const dryrun = runWith(env)

  return (msg) => of(msg)
    .map(convert)
    .chain(verifyInput)
    .chain(dryrun)
    .toPromise()
}

function convert ({ process, data, tags, anchor, ...rest }) {
  return {
    Id: '1234',
    Owner: '1234',
    ...rest,
    Target: process,
    Data: data || '1234',
    Tags: tags || [],
    Anchor: anchor || '0'
  }
}

export function dryrunMainnetWith (env) {
  return (fields) => {
    return of(fields)
      .map(convertToRequest)
      .chain(dispatch(env))
      .map(logResult(env, fields))
      .map(convertToLegacyOutput)
      .toPromise()
  }
}

function convertToRequest (args) {
  const { tags, process, data, ...rest } = args
  return {
    type: 'Message',
    path: `/${process}~process@1.0/compute/serialize~json@1.0`,
    method: 'POST',
    data,
    'data-protocol': 'ao',
    variant: 'ao.N.1',
    target: process,
    'accept-bundle': 'true',
    'accept-codec': 'httpsig@1.0',
    'signing-format': 'ans104',
    ...tags.filter(t => t.name !== 'device').reduce((a, t) => assoc(t.name, t.value, a), {}),
    ...rest
  }
}

// dispatchs the request from context to hyperbeam
function dispatch (env) {
  return fromPromise(env.request)
}

function logResult (env, fields) {
  return (res) => {
    env.logger(
      'Received response from dryrun message sent to path "%s"',
      fields?.path ?? '/'
    )
    return res
  }
}

function convertToLegacyOutput (res) {
  let body = {}
  try {
    body = JSON.parse(JSON.parse(res?.body)?.results?.json?.body)
  } catch (_) {}
  return {
    Output: body?.Output || {},
    Messages: body?.Messages || [],
    Assignments: body?.Assignments || [],
    Spawns: body?.Spawns || [],
    Error: body?.Error
  }
}
