function resultWith ({ fetch, CU_URL, logger }) {
  return async (txId) => {
    logger(`${CU_URL}/result/${txId}`)

    return fetch(`${CU_URL}/result/${txId}`)
      .then(res => res.json())
      .then(res => res || {
        messages: [],
        spawns: [],
        output: ''
      })
  }
}

function selectNodeWith ({ CU_URL, logger }) {
  return (processId) => {
    logger(`Selecting cu for process ${processId}`)
    return CU_URL
  }
}

export default {
  resultWith,
  selectNodeWith
}
