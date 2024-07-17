export function cuFetchWithCache ({ fetch, cache, logger }) {
  logger = logger.child('cuFetchWithCache')
  function checkForRedirect (response) {
    if ([301, 302, 307, 308].includes(response.status)) {
      return response.headers.get('Location')
    }
    return undefined
  }

  async function runFetch (url, opts) {
    const response = await fetch(url, {
      ...opts,
      redirect: 'manual'
    })
    const redirected = checkForRedirect(response)
    if (redirected) {
      const urlObject = new URL(url)
      const processId = urlObject.searchParams.get('process-id')
      if (processId) {
        const redirectURL = new URL(redirected)
        logger('inserting cu redirect into cache for process: %s redirect: %s', processId, redirectURL.host)
        cache.set(processId, redirectURL.host)
      }
      return runFetch(redirected, opts)
    }
    return response
  }

  return async (url, opts) => {
    const requestUrl = new URL(url)
    const processId = requestUrl.searchParams.get('process-id')
    const foundRedirectUrl = cache.get(processId)
    if (foundRedirectUrl) {
      logger('found redirect url in cache for process: %s redirect: %s', processId, foundRedirectUrl)
      // only sets the host, the protocol will be reused from the passed in url
      // this is a safe assumption because all CUs are implementing the same APIs over the same protocols
      requestUrl.host = foundRedirectUrl
    }
    return runFetch(requestUrl.toString(), opts)
  }
}
