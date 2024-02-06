import { LRUCache } from 'lru-cache'

import { logger as _logger } from '../../logger.js'

/**
 * A middleware that provides a response from an In-Memory LRUCache.
 *
 * This allows for efficient in-memory caching of responses, with a consistent memory footprint,
 * with the added benefit of potentially deduping loading of the same data.
 *
 * Overall, this should be a boon for performance as well as memory usage
 *
 * loader: the loading function invoked on MISS
 *
 * keyer: the function that determines the cache key. Accepts a req object and should return a string
 *
 * [evict]: In the case of an error from the load call, the evict is called, which acts as a predicate fn.
 * If true, then the cache is cleared of the value, otherwise, the error is kept cached
 *
 * [maxSize]: the max size in bytes of the LRUCache. Defaults to 10MB
 */
export const withInMemoryCache = ({
  loader,
  keyer,
  evict = (_req, _err) => true,
  maxSize = 1_000_000 * 10
}) => () => {
  const cache = new LRUCache({
    maxSize,
    /**
     * Simply stringify and get the _rough_ size in bytes
     */
    sizeCalculation: (value) => JSON.stringify(value).length
  })

  const logger = _logger.child('InMemoryCache')

  return async (req, res) => {
    const key = keyer(req)

    /**
     * See https://www.npmjs.com/package/lru-cache#status-tracking
     *
     * This allows us to log when our InMemoryCache has a HIT or MISS
     */
    const status = {}
    const cached = cache.get(key, { status })
    logger(`"%s" for key ${key}`, status.get.toUpperCase())

    if (cached) return res.send(cached)

    await loader({ req, res })
      .then((result) => {
        cache.set(key, result)
        res.send(result)
      })
      .catch((err) => {
        if (evict(req, err)) {
          logger('Removing "%s"', key)
          cache.delete(key)
        }
        throw err
      })
  }
}
