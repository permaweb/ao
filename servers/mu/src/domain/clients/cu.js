import { backoff, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

const AO_TESTNET_PROCESS = [
  'AiMTGB8qLZUo3Do9x4vJCCWa-APVxBBoI2KX1jwYQH0',
  'rH_-7vT_IgfFWiDsrcTghIhb9aRclz7lXcK7RCOV2h8',
  'Us4BVLXDjtRz7Qzf7osnNcxTsi4vEjfMWo1RRTzhigQ',
  'KvQhYDJTQwpS3huPUJy5xybUDN3L8SE1mhLOBAt5l6Y',
  'fev8nSrdplynxom78XaQ65jSo7-88RxVVVPwHG8ffZk'
]

const AO_TESTNET_CU_URL = 'https://cu.ao-testnet.xyz'

function resultWith ({ fetch, histogram, CU_URL, logger }) {
  const resultFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'result'
    })
  })

  return async (txId, processId, message) => {
    const cuUrl = AO_TESTNET_PROCESS.includes(processId)
      ? AO_TESTNET_CU_URL
      : CU_URL

    logger(`${cuUrl}/result/${txId}?process-id=${processId}&no-busy=1`)

    const requestOptions = cuUrl === AO_TESTNET_CU_URL
      ? {
          timeout: 0
        }
      : {
          timeout: 0,
          method: 'POST',
          body: JSON.stringify(message),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }

    return backoff(
      () =>
        resultFetch(
          `${cuUrl}/result/${txId}?process-id=${processId}&no-busy=1`,
          requestOptions
        ).then(okRes),
      {
        maxRetries: 5,
        delay: 500,
        log: logger,
        name: `forwardAssignment(${JSON.stringify({
          cuUrl,
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

// TODO: doesn't seem to be used
function selectNodeWith ({ CU_URL, logger }) {
  return async (processId) => {
    logger(`Selecting cu for process ${processId}`)
    if (AO_TESTNET_PROCESS.includes(processId)) {
      return 'https://cu.ao-testnet.xyz'
    }
    return CU_URL
  }
}

function fetchCronWith ({ fetch, histogram, CU_URL, logger }) {
  const cronFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'fetchCron'
    })
  })
  return async ({ processId, cursor }) => {
    let requestUrl = `${CU_URL}/cron/${processId}`
    if (cursor) {
      requestUrl = `${CU_URL}/cron/${processId}?from=${cursor}&limit=50`
    }
    logger(`Fetching cron: ${requestUrl}`)
    return cronFetch(requestUrl).then((r) =>
      r.json().catch((error) => {
        logger(`Failed to parse cron JSON: ${error.toString()}`)
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
