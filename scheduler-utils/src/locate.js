export function locateWith ({ loadProcessScheduler, cache }) {
  /**
   * Locate the scheduler for the given process.
   *
   * Later on, this implementation could encompass the automatic swapping
   * of decentralized sequencers
   *
   * @param {string} process - the id of the process
   * @returns {Promise<{ url: string, address: string }>} - an object whose url field is the Scheduler Location
   */
  return (process) =>
    cache.getByProcess(process)
      .then((cached) => {
        if (cached) return cached
        return loadProcessScheduler(process)
          .then((scheduler) => {
            return Promise.all([
              cache.setByProcess(process, { url: scheduler.url, address: scheduler.owner }, scheduler.ttl),
              cache.setByOwner(scheduler.owner, scheduler.url, scheduler.ttl)
            ])
              .then(() => ({ url: scheduler.url, address: scheduler.owner }))
          })
      })
}
