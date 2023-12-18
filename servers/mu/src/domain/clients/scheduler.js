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

function fetchSequencerProcessWith ({ SCHEDULER_URL, logger }) {
  return async (processId) => {
    logger(`${SCHEDULER_URL}/processes/${processId}`)

    return fetch(`${SCHEDULER_URL}/processes/${processId}`)
      .then(res => res.json())
      .then(res => res || {})
  }
}

export default {
  writeDataItemWith,
  fetchSequencerProcessWith
}
