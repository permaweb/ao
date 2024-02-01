import { fromPromise } from 'hyper-async'
import { dryrunResultSchema } from '../../dal.js'

/**
 * @typedef Env
 * @property {DryrunFetch} dryrunFetch
 *
 * @typedef Message
 * @property {string} Id
 * @property {string} Target
 * @property {string} Owner
 * @property {string} [Anchor]
 * @property {any} Data
 * @property {Record<name,value>[]} Tags
 *
 * @callback Run
 * @param {Message} msg
 *
 * @param {Env} env
 * @returns {Run}
 */
export function runWith ({ dryrunFetch }) {
  return fromPromise(dryrunResultSchema.implement(dryrunFetch))
}
