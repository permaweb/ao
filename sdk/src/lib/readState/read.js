import { fromPromise, of } from 'hyper-async'

import { loadStateSchema } from '../../dal.js'

/**
 * @typedef Env
 * @property {any} loadState
 *
 * @typedef Context
 * @property {string} id - the id of the process being read
 * @property {string} [sortKey] - the sortKey to read up to
 *
 * @callback Read
 * @param {Context} ctx
 * @returns {Async<Record<string, any>>}
 *
 * @param {Env} env
 * @returns {Read}
 */
export function readWith (env) {
  return (ctx) => {
    return of({ id: ctx.id, sortKey: ctx.sortKey })
      .chain(fromPromise(
        loadStateSchema.implement(env.loadState)
      ))
  }
}
