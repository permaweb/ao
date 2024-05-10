import { LRUCache } from 'lru-cache'

export function createLruCache ({ size }) {
  const cache = new LRUCache({
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
  return cache
}

/**
 * @param {{ cache: LRUCache }} params
 */
export function getByProcessWith ({ cache }) {
  return async (process) => {
    if (!cache.max) return
    return cache.get(process)
  }
}

/**
 * @param {{ cache: LRUCache }} params
 */
export function setByProcessWith ({ cache }) {
  return async (process, { url, address }, ttl) => {
    if (!cache.max) return
    return cache.set(process, { url, address }, { ttl })
  }
}

/**
 * @param {{ cache: LRUCache }} params
 */
export function getByOwnerWith ({ cache }) {
  return async (owner) => {
    if (!cache.max) return
    return cache.get(owner)
  }
}

/**
 * @param {{ cache: LRUCache }} params
 */
export function setByOwnerWith ({ cache }) {
  return async (owner, url, ttl) => {
    if (!cache.max) return
    return cache.set(owner, { url, address: owner, ttl }, { ttl })
  }
}
