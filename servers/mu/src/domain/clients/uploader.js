import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function uploadDataItemWith ({ UPLOADER_URL, fetch, histogram, logger }) {
  const dataItemFetch = withTimerMetricsFetch({
    fetch,
    histogram,
    startLabelsFrom: () => ({
      operation: 'uploadDataItem'
    })
  })
  return async (data) => {
    return of(data)
      .map(logger.tap(`Forwarding message to uploader ${UPLOADER_URL}`))
      .chain(
        fromPromise((body) =>
          dataItemFetch(`${UPLOADER_URL}/tx/arweave`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Accept: 'application/json'
            },
            body
          })
        )
      )
      .bimap(logger.tap('Error while communicating with uploader:'), identity)
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
      .map(logger.tap('Successfully forwarded DataItem to uploader'))
      .toPromise()
  }
}

export default {
  uploadDataItemWith
}
