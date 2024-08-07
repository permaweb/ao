import { backoff, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function resultWith ({ fetch, histogram, CU_URL, logger }) {
  const resultFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'result'
    }),
    logger
  })

  return async (txId, processId, logId) => {
    logger({ log: `${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1`, logId })

    const requestOptions = {
      timeout: 0
    }

    return backoff(
      () =>
        resultFetch(
          `${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1`,
          requestOptions,
          logId
        ).then(okRes),
      {
        maxRetries: 5,
        delay: 500,
        log: logger,
        logId,
        name: `fetchResult(${JSON.stringify({
          CU_URL,
          processId,
          txId
        })})`
      }
    )
      .then((res) => res.json())
      .then(
        (res) =>
          res || {
            Messages: [],
            Spawns: [],
            Assignments: [],
            Output: ''
          }
      )
  }
}

function selectNodeWith ({ CU_URL, logger }) {
  return async ({ processId, logId }) => {
    logger({ log: `Selecting cu for process ${processId}`, logId })
    return CU_URL
  }
}

function fetchCronWith ({ fetch, histogram, CU_URL, logger }) {
  const cronFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'fetchCron'
    }),
    logger
  })
  return async ({ processId, cursor }) => {
    let requestUrl = `${CU_URL}/cron/${processId}`
    if (cursor) {
      requestUrl = `${CU_URL}/cron/${processId}?from=${cursor}&limit=50`
    }
    logger({ log: `Fetching cron: ${requestUrl}` })
    return cronFetch(requestUrl).then((r) =>
      r.json().catch((error) => {
        logger({ log: `Failed to parse cron JSON: ${error.toString()}` })
        return { edges: [] }
      })
    )
  }
}

export default {
  fetchCronWith,
  resultWith,
  selectNodeWith
}
