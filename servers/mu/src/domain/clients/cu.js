const okRes = (res) => {
  if (res.ok) return res
  throw res
}
export const backoff = (
  fn,
  { maxRetries = 3, delay = 500, log, name }
) => {
  /**
   * Recursive function that recurses with exponential backoff
   */
  console.log('BACKOFF')
  const action = (retry, delay) => {
    return Promise.resolve()
      .then(fn)
      .catch((err) => {
        console.log('BACKOFF ERROR')
        // Reached max number of retries
        if (retry >= maxRetries) {
          log(`(${name}) Reached max number of retries: ${maxRetries}. Bubbling err`)
          return Promise.reject(err)
        }

        const newRetry = retry + 1
        const newDelay = delay + delay
        log(`(${name}) Backing off -- retry ${newRetry} starting in ${newDelay} milliseconds...`)
        return new Promise((resolve, reject) =>
          setTimeout(
          /**
           * increment the retry count Retry with an exponential backoff
           */
            () => action(newRetry, newDelay).then(resolve).catch(reject),
            /**
             * Retry in {delay} milliseconds
             */
            delay
          )
        )
      })
  }

  return action(0, delay)
}
function resultWith ({ fetch, CU_URL, logger }) {
  return async (txId, processId) => {
    // CU_URL = 'http://localhost:6363'
    logger(`${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1`)

    console.log('Jack2.5', { url: `${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1` })
    const requestOptions = {
      timeout: 0
    }

    return backoff(
      () => fetch(`${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1`, requestOptions).then((res) => {
        console.log('BACKOFF2 RES', { res })
        return okRes(res)
      }),
      { maxRetries: 5, delay: 500, log: logger, name: `forwardAssignment(${JSON.stringify({ CU_URL, processId, txId })})` }
    )
      .then(res => res.json())
      .then(res => res || {
        Messages: [],
        Spawns: [],
        Assignments: [],
        Output: ''
      })
  }
}

function selectNodeWith ({ CU_URL, logger }) {
  return async (processId) => {
    // CU_URL = 'http://localhost:6363'
    logger(`Selecting cu for process ${processId}`)
    return CU_URL
  }
}

function fetchCronWith ({ CU_URL, logger }) {
  return async ({ processId, cursor }) => {
    // CU_URL = 'http://localhost:6363'
    let requestUrl = `${CU_URL}/cron/${processId}`
    if (cursor) {
      requestUrl = `${CU_URL}/cron/${processId}?from=${cursor}&limit=50`
    }
    logger(`Fetching cron: ${requestUrl}`)
    return fetch(requestUrl).then(r => r.json()
      .catch(error => {
        logger(`Failed to parse cron JSON: ${error.toString()}`)
        return { edges: [] }
      }))
  }
}

export default {
  fetchCronWith,
  resultWith,
  selectNodeWith
}
