import Dataloader from 'dataloader'
import { LRUCache } from 'lru-cache'

import { logger as _logger } from '../../logger.js'

/**
 * A middleware that provides a response from the long-lived dataloader backed by an In-Memory LRUCache.
 *
 * This allows for efficient in-memory caching of responses, with a consistent memory footprint,
 * with the added benefit of potentially deduping loading of the same data.
 *
 * Overall, this should be a boon for performance as well as memory usage
 *
 * loader: the loading function passed to the dataloader. See dataloader
 * docs for how this function should work: https://www.npmjs.com/package/dataloader
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

  const dataloader = new Dataloader(loader, {
    cacheKeyFn: keyer,
    cacheMap: {
      get: (key) => {
        /**
         * See https://www.npmjs.com/package/lru-cache#status-tracking
         *
         * This allows us to log when our InMemoryCache has a HIT or MISS
         */
        const status = {}
        const res = cache.get(key, { status })
        logger(`"%s" for key ${key}`, status.get.toUpperCase())
        return res
      },
      set: cache.set.bind(cache),
      clear: cache.clear.bind(cache),
      delete: (key) => {
        logger('Removing "%s"', key)
        return cache.delete(key)
      }
    }
  })

  return (req, res) => dataloader.load({ req, res })
    .then(result => res.send(result))
    .catch(err => {
      if (evict(req, err)) dataloader.clear(keyer(req))
      /**
       * After optionally clearing the cache on err,
       * continue bubbling
       */
      throw err
    })
}
