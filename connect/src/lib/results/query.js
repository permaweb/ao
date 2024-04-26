import { fromPromise, of } from 'hyper-async'

import { queryResultsSchema } from '../../dal.js'

/**
 * @typedef Env
 * @property {any} loadState
 *
 * @typedef Context
 * @property {string} id - the transaction id of the process being read
 *
 * @callback Query
 * @param {Context} ctx
 * @returns {Async<Record<string, any>>}
 *
 * @param {Env} env
 * @returns {Query}
 */
export function queryWith ({ queryResults }) {
  queryResults = fromPromise(queryResultsSchema.implement(queryResults))

  return (ctx) => {
    return of({ process: ctx.process, from: ctx.from, to: ctx.to, sort: ctx.sort, limit: ctx.limit })
      .chain(queryResults)
  }
}
