export function validateWith ({ loadScheduler, cache }) {
  /**
   * Validate whether the given wallet address is an ao Scheduler
   *
   * @param {string} address - the wallet address used by the Scheduler
   * @returns {Promise<boolean>} whether the wallet address is Scheduler
   */
  return (address) =>
    cache.getByOwner(address)
      .then((url) => {
        if (url) return
        return loadScheduler(address)
          .then((scheduler) => cache.setByOwner(address, scheduler.url, scheduler.ttl))
      })
      .then(() => true)
}
