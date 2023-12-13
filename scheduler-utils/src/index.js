import * as GatewayClient from './client/gateway.js'
import * as InMemoryClient from './client/in-memory.js'

import { locateWith } from './locate.js'
import { validateWith } from './validate.js'

/**
 * @type {string}
 */
const DEFAULT_GATEWAY_URL = globalThis.GATEWAY_URL || 'https://arweave.net'

/**
 * @typedef ConnectParams
 * @property {number} [cacheSize] - the size of the internal LRU cache
 * @property {string} [GATEWAY_URL] - the url of the gateway to be used
 *
 * Build the apis using the provided configuration. You can currently specify
 *
 * - a GATEWAY_URL. Defaults to https://arweave.net
 * - a cache size for the internal LRU cache. Defaults to 100
 *
 * If either value is not provided, a default will be used.
 * Invoking connect() with no parameters or an empty object is functionally equivalent
 * to using the top-lvl exports
 *
 * @param {ConnectParams} [params]
 */
export function connect ({ cacheSize = 100, GATEWAY_URL = DEFAULT_GATEWAY_URL } = {}) {
  const cache = InMemoryClient.createLruCache({ size: cacheSize })

  const getByOwner = InMemoryClient.getByOwnerWith({ cache })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByOwner = InMemoryClient.setByOwnerWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  /**
   * Locate the scheduler for the given process.
   */
  const locate = locateWith({
    loadProcessScheduler: GatewayClient.loadProcessSchedulerWith({ fetch, GATEWAY_URL }),
    cache: { getByProcess, getByOwner, setByProcess, setByOwner }
  })

  /**
   * Validate whether the given wallet address is an ao Scheduler
   */
  const validate = validateWith({
    loadScheduler: GatewayClient.loadSchedulerWith({ fetch, GATEWAY_URL }),
    cache: { getByProcess, getByOwner, setByProcess, setByOwner }
  })

  return { locate, validate }
}

const { locate, validate } = connect()
export { locate, validate }
