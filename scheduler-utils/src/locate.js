export function locateWith ({
  loadProcessScheduler,
  loadScheduler,
  cache,
  followRedirects,
  checkForRedirect
}) {
  /**
   * Locate the scheduler for the given process.
   *
   * Later on, this implementation could encompass the automatic swapping
   * of decentralized sequencers
   *
   * @param {string} process - the id of the process
   * @param {string} [schedulerHint] - the id of owner of the scheduler, which prevents having to query the process
   * from a gateway, and instead skips to querying Scheduler-Location
   * @returns {Promise<{ url: string, address: string }>} - an object whose url field is the Scheduler Location
   */
  return (process, schedulerHint) =>
    cache.getByProcess(process).then(async (cached) => {
      if (cached) return cached

      return Promise.resolve()
        .then(async () => {
          /**
           * The the scheduler hint was provided,
           * so skip querying the process and instead
           * query the Scheduler-Location record directly
           */
          if (schedulerHint) {
            const byOwner = await cache.getByOwner(schedulerHint)
            if (byOwner) return byOwner

            return loadScheduler(schedulerHint).then((scheduler) => {
              cache.setByOwner(scheduler.owner, scheduler.url, scheduler.ttl)
              return scheduler
            })
          }

          return loadProcessScheduler(process)
        })
        .then(async (scheduler) => {
          console.log('scheduler', scheduler)
          let finalUrl = scheduler.url
          /**
           * If following redirects, then the initial request will be
           * to a router. So we go hit the router and cache the
           * redirected url for performance.
           */
          if (followRedirects) { finalUrl = await checkForRedirect(scheduler.url, process) }

          const byProcess = {
            url: finalUrl,
            address: scheduler.owner
          }
          await cache.setByProcess(process, byProcess, scheduler.ttl)
          return byProcess
        })
    })
}
