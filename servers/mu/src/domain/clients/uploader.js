import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function uploadDataItemWith ({ UPLOADER_URL, fetch, histogram, logger }) {
  const dataItemFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'uploadDataItem'
    }),
    logger
  })
  /**
   * uploadDataItem
   * Upload a Data Item directly to Arweave
   *
   * @param data - the Data Item to upload
   *
   * @returns
   * id - The Arweave tx-id of the uploaded data
   * timestamp
   * signature
   * owner
   *
   */
  return async (data) => {
    return of(data)
      .map(logger.tap({ log: `Forwarding message to uploader ${UPLOADER_URL}` }))
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
      .bimap(logger.tap({ log: 'Error while communicating with uploader:' }), identity)
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
      .map(logger.tap({ log: 'Successfully forwarded DataItem to uploader' }))
      .toPromise()
  }
}

export default {
  uploadDataItemWith
}
