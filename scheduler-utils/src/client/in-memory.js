import LruCache from 'mnemonist/lru-cache-with-delete.js'

/**
 * @type {LruCache}
 */
let internalCache
let internalSize
export function createLruCache ({ size }) {
  if (internalCache) return internalCache
  internalSize = size
  internalCache = new LruCache(size)
  return internalCache
}

export function getByProcessWith ({ cache = internalCache }) {
  return async (process) => {
    if (!internalSize) return
    return cache.get(process)
  }
}

export function setByProcessWith ({ cache = internalCache }) {
  return async (process, url, ttl) => {
    if (!internalSize) return
    setTimeout(() => cache.delete(process), ttl)
    return cache.set(process, url)
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
    setTimeout(() => cache.delete(owner), ttl)
    return cache.set(owner, url)
  }
}
