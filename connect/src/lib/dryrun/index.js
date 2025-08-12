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
