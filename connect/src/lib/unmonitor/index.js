import { identity } from 'ramda'
import { of } from 'hyper-async'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { errFrom } from '../utils.js'
import { uploadUnmonitorWith } from './upload-unmonitor.js'

/**
 * @typedef Env1
 *
 * TODO: maybe allow passing tags and anchor eventually?
 * @typedef SendMonitorArgs
 * @property {string} process
 * @property {string} [data]
 * @property {Types['signer']} signer
 *
 * @callback SendMonitor
 * @param {SendMonitorArgs} args
 * @returns {Promise<string>} the id of the data item that represents this message
 *
 * @param {Env1} - the environment
 * @returns {SendMonitor}
 */
export function unmonitorWith (env) {
  const uploadUnmonitor = uploadUnmonitorWith(env)

  return ({ process, signer }) => of({ id: process, signer })
    .chain(uploadUnmonitor)
    .map((ctx) => ctx.monitorId)
    .bimap(errFrom, identity)
    .toPromise()
}
