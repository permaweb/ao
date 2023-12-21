import { InvalidSchedulerLocationError } from './err.js'

export function validateWith ({ loadScheduler, cache }) {
  /**
   * Validate whether the given wallet address is an ao Scheduler
   *
   * @param {string} address - the wallet address used by the Scheduler
   * @returns {Promise<boolean>} whether the wallet address is Scheduler
   */
  return (address) =>
    cache.getByOwner(address)
      .then((cached) => {
        if (cached) return true
        return loadScheduler(address)
          .then((scheduler) => cache.setByOwner(address, scheduler.url, scheduler.ttl))
          .then(() => true)
          .catch((err) => {
            if (err instanceof InvalidSchedulerLocationError) return false
            /**
             * Unknown error continue to bubble
             */
            throw err
          })
      })
}
