import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'

function writeDataItemWith ({ fetch, logger }) {
  return async ({ data, suUrl }) => {
    return of(Buffer.from(data, 'base64'))
      .map(logger.tap(`Forwarding message to SU ${suUrl}`))
      .chain(fromPromise((body) =>
        fetch(suUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Accept: 'application/json'
          },
          body
        })
      ))
      .bimap(
        logger.tap('Error while communicating with SU:'),
        identity
      )
      .bichain(
        (err) => Rejected(JSON.stringify(err)),
        fromPromise(async (res) => {
          if (!res?.ok) {
            const text = await res.text()
            throw new Error(`${res.status}: ${text}`)
          }
          return res.json()
        })
      )
      .map(logger.tap('Successfully forwarded DataItem to SU'))
      .toPromise()
  }
}

function writeAssignmentWith ({ fetch, logger }) {
  return async ({ txId, processId, baseLayer, exclude, suUrl }) => {
    return of({ txId, processId, baseLayer, exclude, suUrl })
      .map(logger.tap(`Forwarding Assignment to SU ${suUrl}`))
      .chain(fromPromise(({ txId, processId, baseLayer, exclude, suUrl }) => {
        let url = `${suUrl}/?process-id=${processId}&assign=${txId}`
        // aop2 base-layer param
        if (baseLayer === '') {
          url += '&base-layer'
        }
        // aop1 exclude param
        if (exclude) {
          url += `&exclude=${exclude}`
        }
        return fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Accept: 'application/json'
          }
        })
      }
      ))
      .bimap(
        logger.tap('Error while communicating with SU:'),
        identity
      )
      .bichain(
        (err) => Rejected(JSON.stringify(err)),
        fromPromise(async (res) => {
          if (!res?.ok) {
            const text = await res.text()
            throw new Error(`${res.status}: ${text}`)
          }
          return res.json()
        })
      )
      .map(logger.tap('Successfully forwarded Assignment to SU'))
      .toPromise()
  }
}

function fetchSchedulerProcessWith ({ fetch, logger, setByProcess, getByProcess }) {
  return (processId, suUrl) => {
    return getByProcess(processId)
      .then(cached => {
        if (cached) {
          logger(`cached process found ${processId}`)
          return cached
        }

        logger(`${suUrl}/processes/${processId}`)

        return fetch(`${suUrl}/processes/${processId}`)
          .then(res => res.json())
          .then(res => {
            if (res) {
              return setByProcess(processId, res).then(() => res)
            }
          })
      })
      .catch((e) => {
        logger(`error fetching process ${e}`)
      })
  }
}

export default {
  writeDataItemWith,
  writeAssignmentWith,
  fetchSchedulerProcessWith
}
