export function locateWith ({ loadProcessScheduler, cache, followRedirects, checkForRedirect }) {
  const cacheResults = async (process, scheduler, url) => {
    const res = { url, address: scheduler.owner }
    await Promise.all([
      cache.setByProcess(process, res, scheduler.ttl),
      cache.setByOwner(scheduler.owner, url, scheduler.ttl)
    ])
    return res
  }

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
    cache.getByProcess(process).then(cached => {
      if (cached) return cached
      return loadProcessScheduler(process).then(async scheduler => {
        let finalUrl = scheduler.url
        /**
         * If following redirects, then the initial request will be
         * to a router. So we go hit the router and cache the
         * redirected url for performance.
         */
        if (followRedirects) {
          finalUrl = await checkForRedirect(scheduler.url, process)
        }
        return cacheResults(process, scheduler, finalUrl)
      })
    })
}
