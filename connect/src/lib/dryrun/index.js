import { of } from 'hyper-async'
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
 *
 * @callback DryRun
 * @param {MessageInput} msg
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
    ...rest,
    Target: process,
    Data: data || '1234',
    Tags: tags || [],
    Anchor: anchor || '0'
  }
}
