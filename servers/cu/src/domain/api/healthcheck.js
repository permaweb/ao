import { fromPromise } from 'hyper-async'

/**
 * @typedef Env
 *
 * @typedef Result
 * @property {string} address
 * @property {number} timestamp
 *
 * @callback Healthcheck
 * @returns {Promise<Result>} result
 *
 * @param {Env} - the environment
 * @returns {Healthcheck}
 */
export function healthcheckWith (env) {
  return () => {
    return fromPromise(env.walletAddress)()
      .map((address) => ({
        address,
        timestamp: new Date().getTime()
      }))
  }
}
