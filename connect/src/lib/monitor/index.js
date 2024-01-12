import { identity } from 'ramda'
import { of } from 'hyper-async'

// eslint-disable-next-line no-unused-vars
import { Types } from '../../dal.js'
import { errFrom } from '../utils.js'
import { verifyProcessWith } from '../verify-process.js'
import { uploadMonitorWith } from './upload-monitor.js'

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
export function monitorWith (env) {
  const verifyProcess = verifyProcessWith(env)
  const uploadMonitor = uploadMonitorWith(env)

  return ({ process, signer }) => of({ id: process, signer })
    .chain(verifyProcess)
    .chain(uploadMonitor)
    .map((ctx) => ctx.monitorId)
    .bimap(errFrom, identity)
    .toPromise()
}
