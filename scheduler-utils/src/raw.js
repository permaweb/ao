import { InvalidSchedulerLocationError } from './err.js'

export function rawWith ({ loadScheduler, cache }) {
  /**
   * Return the `Scheduler-Location` record for the address
   * or undefined, if it cannot be found
   *
   * @param {string} address - the wallet address used by the Scheduler
   * @returns {Promise<{ url: string } | undefined >} whether the wallet address is Scheduler
   */
  return (address) =>
    cache.getByOwner(address)
      .then((cached) => {
        if (cached) return cached
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
