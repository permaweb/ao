import { fromPromise, of } from 'hyper-async'

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} CU_URL
 *
 * @typedef LoadResultArgs
 * @property {string} id - the id of the process being read
 *
 * @callback LoadResult
 * @param {LoadResultArgs} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {LoadResult}
 */
export function loadResultWith ({ fetch, CU_URL, logger }) {
  return ({ id, processId }) => {
    return of(`${CU_URL}/result/${id}?process-id=${processId}`)
      .map(logger.tap('fetching message result from CU'))
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
