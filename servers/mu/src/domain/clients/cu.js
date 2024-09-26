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

  /**
   * result (fetchResult)
   * Given a tx-id and a processId, retrieve the result of that tx from the CU
   *
   * @param txId - the tx-id to query
   * @param processId - the processId to query
   * @param logId - The logId to aggregate the logs by
   *
   * @returns
   * Messages - An array of messages to be pushed
   * Assignments - An array of assignments to be pushed
   * Spawns - An array of spawns to be pushed
   * Output - The message's output
   * GasUsed - The gas used to process the current message
   */
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
      .then((res) => {
        return res
      })
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
  /**
   * fetchCron
   * Given a process and a cursor, fetch the cron from the CU
   *
   * @param processId - The process to fetch the cron of
   * @param cursor - The cursor to begin at
   *
   * @returns
   * hasNextPage - whether the cron results has another page
   * edges - an array of cron output. Includes Messages, Assignments, Spawns, and Output
   */
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
