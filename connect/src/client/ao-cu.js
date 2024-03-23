import { fromPromise, of } from 'hyper-async'
/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} CU_URL
 */

/**
 * @typedef Message
 * @property {string} Id
 * @property {string} Target
 * @property {string} Owner
 * @property {string} [Anchor]
 * @property {any} Data
 * @property {Record<name,value>[]} Tags
 *
 * @typedef Result
 * @property {any} Output
 * @property {Message[]} Messages
 * @property {Message[]} Spawns
 * @property {string} [Error]
 *
 * @callback DryrunFetch
 * @param {Message} msg
 * @returns {Result}
 *
 * @param {Env3} env
 * @returns {DryrunFetch}
 */
export function dryrunFetchWith ({ fetch, CU_URL, logger }) {
  return (msg) => of(msg)
    .map(logger.tap('posting dryrun request to CU'))
    .chain(fromPromise(msg => fetch(`${CU_URL}/dry-run?process-id=${msg.Target}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      redirect: 'follow',
      body: JSON.stringify(msg)
    }).then(res => res.json())))
    .toPromise()
}

/**
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
          },
          redirect: 'follow'
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
  return ({ process, from, to, sort, limit }) => {
    const target = new URL(`${CU_URL}/results/${process}`)
    const params = new URLSearchParams(target.search)
    if (from) { params.append('from', from) }
    if (to) { params.append('to', to) }
    if (sort) { params.append('sort', sort) }
    if (limit) { params.append('limit', limit) }
    target.search = params

    return of(target.toString())
      .map(logger.tap('fetching message result from CU'))
      .chain(fromPromise(async (url) =>
        fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          },
          redirect: 'follow'
        })
          .then(res => res.json())
      )).toPromise()
  }
}
