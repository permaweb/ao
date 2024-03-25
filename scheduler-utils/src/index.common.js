import * as GatewayClient from './client/gateway.js'
import * as InMemoryClient from './client/in-memory.js'
import * as SchedulerClient from './client/scheduler.js'

import { locateWith } from './locate.js'
import { rawWith } from './raw.js'
import { validateWith } from './validate.js'

export * from './err.js'

const DEFAULT_GRAPHQL_URL = 'https://arweave.net/graphql'

/**
 * @typedef ConnectParams
 * @property {number} [cacheSize] - the size of the internal LRU cache
 * @property {boolean} [followRedirects] - whether to follow redirects and cache that url instead
 * @property {string} [GRAPHQL_URL] - the url of the gateway to be used
 *
 * Build the apis using the provided configuration. You can currently specify
 *
 * - a GRAPHQL_URL. Defaults to https://arweave.net/graphql
 * - a cache size for the internal LRU cache. Defaults to 100
 * - whether or not to follow redirects when locating a scheduler. Defaults to false
 *
 * If either value is not provided, a default will be used.
 * Invoking connect() with no parameters or an empty object is functionally equivalent
 * to using the top-lvl exports
 *
 * @param {ConnectParams} [params]
 */
export function connect ({ cacheSize = 100, GRAPHQL_URL = DEFAULT_GRAPHQL_URL, followRedirects = false } = {}) {
  const _cache = InMemoryClient.createLruCache({ size: cacheSize })

  const loadScheduler = GatewayClient.loadSchedulerWith({ fetch, GRAPHQL_URL })
  const cache = {
    getByProcess: InMemoryClient.getByProcessWith({ cache: _cache }),
    getByOwner: InMemoryClient.getByOwnerWith({ cache: _cache }),
    setByProcess: InMemoryClient.setByProcessWith({ cache: _cache }),
    setByOwner: InMemoryClient.setByOwnerWith({ cache: _cache })
  }
  /**
   * Locate the scheduler for the given process.
   */
  const locate = locateWith({
    loadProcessScheduler: GatewayClient.loadProcessSchedulerWith({ fetch, GRAPHQL_URL }),
    loadScheduler,
    cache,
    followRedirects,
    checkForRedirect: SchedulerClient.checkForRedirectWith({ fetch })
  })

  /**
   * Validate whether the given wallet address is an ao Scheduler
   */
  const validate = validateWith({ loadScheduler, cache })

  /**
   * Return the `Scheduler-Location` record for the address
   * or undefined, if it cannot be found
   */
  const raw = rawWith({ loadScheduler, cache })

  return { locate, validate, raw }
}
