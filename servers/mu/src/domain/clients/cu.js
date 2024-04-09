function resultWith ({ fetch, CU_URL, logger }) {
  return async (txId, processId) => {
    logger(`${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1`)

    const requestOptions = {
      timeout: 0
    }

    return fetch(`${CU_URL}/result/${txId}?process-id=${processId}&no-busy=1`, requestOptions)
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
    logger(`Selecting cu for process ${processId}`)
    return CU_URL
  }
}

export default {
  resultWith,
  selectNodeWith
}
