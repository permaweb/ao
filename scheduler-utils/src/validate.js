import { InvalidSchedulerLocationError } from './err.js'

export function validateWith ({ loadScheduler, cache }) {
  /**
   * Validate whether the given wallet address is an ao Scheduler
   *
   * @param {string} address - the wallet address used by the Scheduler
   * @returns {Promise<{ url: string, ttl: string }>} whether the wallet address is Scheduler
   */
  return (address) =>
    cache.getByOwner(address)
      .then((url) => {
        if (url) return { url }
        return loadScheduler(address)
          .then((scheduler) =>
            cache.setByOwner(address, scheduler.url, scheduler.ttl)
              .then(() => ({ url: scheduler.url }))
          )
          .catch((err) => {
            if (err instanceof InvalidSchedulerLocationError) return undefined
            /**
             * Unknown error continue to bubble
             */
            throw err
          })
      })
}
