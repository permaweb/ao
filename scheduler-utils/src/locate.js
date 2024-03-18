export function locateWith ({ loadProcessScheduler, cache, followRedirects, checkForRedirect }) {
  const cacheResults = async (process, scheduler, url, finalUrl) => {
    const byProcess = { url: finalUrl, address: scheduler.owner }
    await Promise.all([
      cache.setByProcess(process, byProcess, scheduler.ttl),
      /**
       * The redirect may be process specific, so we do not want to cache that url
       * for the owner, and instead cache the url obtained from the
       * Scheduler-Location record
       */
      cache.setByOwner(scheduler.owner, url, scheduler.ttl)
    ])
    return byProcess
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
        if (followRedirects) finalUrl = await checkForRedirect(scheduler.url, process)
        return cacheResults(process, scheduler, scheduler.url, finalUrl)
      })
    })
}
