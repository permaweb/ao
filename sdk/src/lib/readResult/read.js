import { fromPromise, of } from 'hyper-async'

import { loadResultSchema } from '../../dal.js'

/**
 * @typedef Env
 * @property {any} loadState
 *
 * @typedef Context
 * @property {string} id - the transaction id of the process being read
 *
 * @callback Read
 * @param {Context} ctx
 * @returns {Async<Record<string, any>>}
 *
 * @param {Env} env
 * @returns {Read}
 */
export function readWith ({ loadResult }) {
  loadResult = fromPromise(loadResultSchema.implement(loadResult))

  return (ctx) => {
    return of({ id: ctx.id })
      .chain(loadResult)
  }
}
