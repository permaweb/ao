import * as GatewayClient from './client/gateway.js'
import * as InMemoryClient from './client/in-memory.js'
import * as SchedulerClient from './client/scheduler.js'

import { locateWith } from './locate.js'
import { rawWith } from './raw.js'
import { validateWith } from './validate.js'
import { getProcessWith } from './getProcess.js'

export * from './err.js'

const DEFAULT_CACHE_SIZE = 100
const DEFAULT_GRAPHQL_URL = 'https://arweave.net/graphql'
const DEFAULT_HB_GRAPHQL_URL = 'https://cache.forward.computer'
const DEFAULT_GRAPHQL_MAX_RETRIES = 0
const DEFAULT_GRAPHQL_RETRY_BACKOFF = 300
const DEFAULT_FOLLOW_REDIRECTS = false

/**
 * @typedef ConnectParams
 * @property {number} [cacheSize] - the size of the internal LRU cache
 * @property {boolean} [followRedirects] - whether to follow redirects and cache that url instead
 * @property {string} [GRAPHQL_URL] - the url of the gateway to be used
 * @property {number} [GRAPHQL_MAX_RETRIES] - the number of times to retry querying the gateway, utilizing an exponential backoff
 * @property {number} [GRAPHQL_RETRY_BACKOFF] - the initial backoff, in milliseconds
 *
 * Build the apis using the provided configuration. You can currently specify
 *
 * - a cache size for the internal LRU cache. Defaults to 100
 * - whether or not to follow redirects when locating a scheduler. Defaults to false
 * - a GRAPHQL_URL. Defaults to https://arweave.net/graphql
 * - a GRAPHQL_MAX_RETRIES. Defaults to 0
 * - a GRAPHQL_RETRY_BACKOFF. Defaults to 300 (moot if GRAPHQL_MAX_RETRIES is set to 0)
 *
 * If any value is not provided, a default will be used.
 * Invoking connect() with no parameters or an empty object is functionally equivalent
 * to using the top-lvl exports
 *
 * @param {ConnectParams} [params]
 */
export function connect ({
  cacheSize = DEFAULT_CACHE_SIZE,
  followRedirects = DEFAULT_FOLLOW_REDIRECTS,
  GRAPHQL_URL = DEFAULT_GRAPHQL_URL,
  GRAPHQL_MAX_RETRIES = DEFAULT_GRAPHQL_MAX_RETRIES,
  GRAPHQL_RETRY_BACKOFF = DEFAULT_GRAPHQL_RETRY_BACKOFF,
  HB_GRAPHQL_URL = DEFAULT_HB_GRAPHQL_URL
} = {}) {
  const _cache = InMemoryClient.createLruCache({ size: cacheSize })
  const _processCache = InMemoryClient.createLruCache({ size: cacheSize })
  const loadScheduler = GatewayClient.loadSchedulerWith({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })
  const cache = {
    getByProcess: InMemoryClient.getByProcessWith({ cache: _cache }),
    getByOwner: InMemoryClient.getByOwnerWith({ cache: _cache }),
    setByProcess: InMemoryClient.setByProcessWith({ cache: _cache }),
    setByOwner: InMemoryClient.setByOwnerWith({ cache: _cache })
  }

  const processCache = {
    getProcessResponse: InMemoryClient.getProcessResponseWith({ cache: _processCache }),
    setProcessResponse: InMemoryClient.setProcessResponseWith({ cache: _processCache })
  }

  /**
   * Locate the scheduler for the given process.
   */
  const locate = locateWith({
    loadProcessScheduler: GatewayClient.loadProcessSchedulerWith({ fetch, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF }),
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

  /**
   * Get the process for the given id.
   */
  const getProcess = getProcessWith({
    getProcess: GatewayClient.loadProcessWith({ fetch, HB_GRAPHQL_URL, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF }),
    cache: processCache
  })

  return { locate, validate, raw, getProcess }
}
