import { LRUCache } from 'lru-cache'

/**
 * @type {LRUCache}
 */
let internalCache
let internalSize
export function createLruCache ({ size }) {
  if (internalCache) return internalCache
  internalSize = size
  internalCache = new LRUCache({
    /**
     * number of entries
     */
    max: size,
    /**
     * max size of cache, as a scalar.
     *
     * In our case, characters (see sizeCalculation)
     */
    maxSize: 1_000_000 * 5,
    /**
     * Simply stringify to get the bytes
     */
    sizeCalculation: (v) => JSON.stringify(v).length,
    allowStale: true
  })
  return internalCache
}

export function getByProcessWith ({ cache = internalCache }) {
  return async (process) => {
    if (!internalSize) return
    return cache.get(process)
  }
}

export function setByProcessWith ({ cache = internalCache }) {
  return async (process, { url, address }, ttl) => {
    if (!internalSize) return
    return cache.set(process, { url, address }, { ttl })
  }
}

export function getByOwnerWith ({ cache = internalCache }) {
  return async (owner) => {
    if (!internalSize) return
    return cache.get(owner)
  }
}

export function setByOwnerWith ({ cache = internalCache }) {
  return async (owner, url, ttl) => {
    if (!internalSize) return
    return cache.set(owner, { url, owner, ttl }, { ttl })
  }
}
