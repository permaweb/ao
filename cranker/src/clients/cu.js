function resultWith ({ fetch, CU_URL, logger }) {
  return async (txId, processId) => {
    logger(`${CU_URL}/result/${txId}?process-id=${processId}`)

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

    console.log(requestUrl)

    if (cursor) {
      requestUrl = `${CU_URL}/cron/${processId}?from=${cursor}`
    }

    let txt = ''

    try {
      const response = await fetch(requestUrl)

      const teedOff = response.body.tee()
      const r1 = new Response(teedOff[0])
      const r2 = new Response(teedOff[1])
      txt = await r1.text()

      const scheduled = await r2.json()
      return scheduled
    } catch (error) {
      console.log('Error in fetchScheduled:', error)
      console.log('for monitor: ')
      console.log(monitor)
      console.log('cu response')
      console.log(txt)
    }
  }
}

export default {
  resultWith,
  selectNodeWith,
  fetchCronWith
}
