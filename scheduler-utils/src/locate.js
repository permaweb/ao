export function locateWith ({ loadProcessScheduler, cache }) {
  /**
   * Locate the scheduler for the given process.
   *
   * Later on, this implementation could encompass the automatic swapping
   * of decentralized sequencers
   *
   * @param {string} process - the id of the process
   * @returns {Promise<{ url: string }>} - an object whose url field is the Scheduler Location
   */
  return (process) =>
    cache.getByProcess(process)
      .then((url) => {
        if (url) return url
        return loadProcessScheduler(process)
          .then((scheduler) => {
            return Promise.all([
              cache.setByProcess(process, scheduler.url, scheduler.ttl),
              cache.setByOwner(scheduler.owner, scheduler.url, scheduler.ttl)
            ])
              .then(() => scheduler.url)
          })
      })
      .then((url) => ({ url }))
}
