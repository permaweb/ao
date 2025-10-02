import cron from 'node-cron'

import { messageSchema } from '../model.js'
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
  return async (txId, processId, logId, customCuUrl) => {
    let cuUrl = CU_URL
    if (customCuUrl) {
      cuUrl = customCuUrl
    }
    logger({ log: `${cuUrl}/result/${txId}?process-id=${processId}&no-busy=1`, logId })

    const requestOptions = {
      timeout: 0
    }

    return backoff(
      () =>
        resultFetch(
          `${cuUrl}/result/${txId}?process-id=${processId}&no-busy=1`,
          requestOptions,
          logId
        ).then(okRes),
      {
        maxRetries: 5,
        delay: 500,
        log: logger,
        logId,
        name: `fetchResult(${JSON.stringify({
          cuUrl,
          processId,
          txId
        })})`
      }
    )
      .then((res) => res.json())
      .then((res) => {
        const parsedMessages = res.Messages.filter(msg => {
          const { success, error } = messageSchema.safeParse(msg)
          if (!success && error) {
            logger({ log: `Failed to parse message, skipping: ${error.toString()}` })
          }
          return success
        })
        return { ...res, Messages: parsedMessages }
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

function fetchHyperBeamResultWith ({ fetch, histogram, logger, fetchHBProcesses}) {
  const hbFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'fetchHyperBeamResult'
    }),
    logger
  })

  /**
   * fetchHyperBeamResult
   * Fetches result from HyperBeam scheduler using the new endpoint format
   *
   * @param {string} processId - The process ID
   * @param {string} assignmentNum - The assignment/slot number
   * @param {string} logId - The logId to aggregate the logs by
   *
   * @returns result data from HyperBeam scheduler
   */
  return async ({ processId, assignmentNum, logId }) => {
    const { HB_PROCESSES } = await fetchHBProcesses()
    const HB_URL = HB_PROCESSES[processId]
    const resultUrl = `${HB_URL}/${processId}~process@1.0/compute&slot=${assignmentNum}/results?require-codec=application/json&accept-bundle=true`
    logger({ log: `Fetching result from HyperBeam: ${resultUrl}`, logId })
    return backoff(
      () => hbFetch(resultUrl).then((res) => okRes(res)),
      {
        maxRetries: 5,
        delay: 500,
        log: logger,
        logId,
        name: `fetchHyperBeamResult(${processId}, ${assignmentNum})`
      }
    )
      .then(async (res) => {
        if (!res?.ok) {
          const text = await res.text()
          throw new Error(`${res.status}: ${text}`)
        }
        return res.json()
      })
      .then((res) => {
      // Parse result so that MU can use it
        const result = JSON.parse(res.json?.body ?? res.json)
        // Attach isHyperBeamResult to result
        return { ...result, isHyperBeamResult: true }
      })
      .then((result) => {
        logger({ log: 'Successfully fetched result from HyperBeam scheduler', logId })
        return result
      })
      .catch((e) => {
        logger({ log: `Error fetching result from HyperBeam scheduler: ${e}`, logId })
        throw e
      })
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
  selectNodeWith,
  fetchHyperBeamResultWith
}
