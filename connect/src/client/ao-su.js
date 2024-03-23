import LruMap from 'mnemonist/lru-map.js'

/**
 * @type {LruMap}
 */
let processMetaCache
export const createProcessMetaCache = ({ MAX_SIZE }) => {
  if (processMetaCache) return processMetaCache

  processMetaCache = new LruMap(MAX_SIZE)
  return processMetaCache
}

export const loadProcessMetaWith = ({ logger, fetch, cache = processMetaCache }) => {
  return async ({ suUrl, processId }) => {
    if (cache.has(processId)) return cache.get(processId)

    return fetch(`${suUrl}/processes/${processId}`, { method: 'GET', redirect: 'follow' })
      .then(async (res) => {
        if (res.ok) return res.json()
        logger('Error Encountered when fetching process meta from SU \'%s\' for process \'%s\'', suUrl, processId)
        throw new Error(`Encountered Error fetching scheduled messages from Scheduler Unit: ${res.status}: ${await res.text()}`)
      })
      .then((meta) => {
        logger('Caching process meta for process \'%s\'', processId)
        /**
         * Store in the cache for next time
         */
        cache.set(processId, { tags: meta.tags })
        return meta
      })
  }
}
