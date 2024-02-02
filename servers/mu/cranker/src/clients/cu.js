function resultWith ({ CU_URL, logger }) {
  return async ({ txId, processId }) => {
    logger(`${CU_URL}/result/${txId}?process-id=${processId}`)
    console.log(`${CU_URL}/result/${txId}?process-id=${processId}`)

    const requestOptions = {
      timeout: 0
    }

    return fetch(`${CU_URL}/result/${txId}?process-id=${processId}`, requestOptions)
      .then(res => res.json())
      .then(res => res || {
        Messages: [],
        Spawns: [],
        Output: ''
      })
  }
}

function selectNodeWith ({ CU_URL, logger }) {
  return async (processId) => {
    logger(`Selecting cu for process ${processId}`)
    return CU_URL
  }
}

function fetchCronWith ({ CU_URL }) {
  return async ({ processId, cursor }) => {
    let requestUrl = `${CU_URL}/cron/${processId}`
    if (cursor) {
      requestUrl = `${CU_URL}/cron/${processId}?from=${cursor}`
    }
    return fetch(requestUrl).then(r => r.json())
  }
}

export default {
  resultWith,
  selectNodeWith,
  fetchCronWith
}
