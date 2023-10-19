import { fromPromise, of } from 'hyper-async'

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} CU_URL
 *
 * @typedef LoadStateArgs
 * @property {string} id - the id of the process being read
 * @property {string} [sortKey] - the sortKey to read up to. Defaults to latest
 *
 * @callback LoadState
 * @param {LoadStateArgs} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {LoadState}
 */
export function loadStateWith ({ fetch, CU_URL, logger }) {
  return ({ id, sortKey }) => {
    return of({ id, sortKey })
      .map(ctx => {
        if (!ctx.sortKey) return ctx
        return { ...ctx, params: new URLSearchParams({ to: ctx.sortKey }) }
      })
      .map(({ id, params }) => `${CU_URL}/state/${id}${params ? `?${params.toString()}` : ''}`)
      .map(logger.tap('fetching process state from CU'))
      .chain(fromPromise(async (url) =>
        fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        })
          .then(res => res.json())
      )).toPromise()
  }
}
