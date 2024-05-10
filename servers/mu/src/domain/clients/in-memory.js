import { LRUCache } from 'lru-cache'

/**
 * @type {LRUCache}
 */
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

export function getByProcessWith ({ cache }) {
  return async (processId) => {
    if (!cache.max) return
    return cache.get(processId)
  }
}

export function setByProcessWith ({ cache }) {
  return async (processId, processData) => {
    if (!cache.max) return
    return cache.set(processId, processData)
  }
}

export function getByIdWith ({ cache }) {
  return async (id) => {
    if (!cache.max) return
    return cache.get(id)
  }
}

export function setByIdWith ({ cache }) {
  return async (id, val) => {
    if (!cache.max) return
    return cache.set(id, val)
  }
}
