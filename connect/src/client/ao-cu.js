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

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} CU_URL
 *
 * @typedef QueryResultsArgs
 * @property {string} process - the id of the process being read
 * @property {string} from - cursor to start the list of results
 * @property {string} to - cursor to stop the list of results
 * @property {string} sort - "ASC" or "DESC" to describe the order of list
 *
 * @callback QueryResults
 * @param {QueryResultsArgs} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {QueryResults}
 */
export function queryResultsWith ({ fetch, CU_URL, logger }) {
  return ({ process, from, to, sort }) => {
    const target = new URL(`${CU_URL}/results/${process}?process-id=${process}`)
    const params = new URLSearchParams(target.search)
    if (from) { params.append('from', from) }
    if (to) { params.append('to', to) }
    if (sort) { params.append('sort', sort) }
    target.search = params

    return of(target.toString())
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
