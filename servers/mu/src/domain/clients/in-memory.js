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
  return async (processId) => {
    if (!internalSize) return
    return cache.get(processId)
  }
}

export function setByProcessWith ({ cache = internalCache }) {
  return async (processId, processData) => {
    if (!internalSize) return
    return cache.set(processId, processData)
  }
}
