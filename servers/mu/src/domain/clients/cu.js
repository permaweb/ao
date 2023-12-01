function resultWith ({ fetch, CU_URL, logger }) {
  return async (txId) => {
    logger(`${CU_URL}/result/${txId}`)

    const requestOptions = {
      timeout: 0
    }

    return fetch(`${CU_URL}/result/${txId}`, requestOptions)
      .then(res => res.json())
      .then(res => res || {
        messages: [],
        spawns: [],
        output: ''
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
