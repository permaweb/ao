import { getByOwnerSchema, loadSchedulerSchema, setByOwnerSchema } from './dal.js'
import { InvalidSchedulerLocationError } from './err.js'

export function rawWith ({ loadScheduler, cache }) {
  loadScheduler = loadSchedulerSchema.implement(loadScheduler)
  const getByOwner = getByOwnerSchema.implement(cache.getByOwner)
  const setByOwner = setByOwnerSchema.implement(cache.setByOwner)
  /**
   * Return the `Scheduler-Location` record for the address
   * or undefined, if it cannot be found
   *
   * @param {string} address - the wallet address used by the Scheduler
   * @returns {Promise<{ url: string } | undefined >} whether the wallet address is Scheduler
   */
  return (address) =>
    getByOwner(address)
      .then((cached) => {
        if (cached) return { url: cached.url }
        return loadScheduler(address)
          .then((scheduler) =>
            setByOwner(address, scheduler.url, scheduler.ttl)
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
