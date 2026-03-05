import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function uploadDataItemWith ({ UPLOADER_URL, fetch, histogram, logger, HB_GRAPHQL_URL }) {
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
   * Upload a Data Item directly to Arweave, and fire-and-forget to HB.
   *
   * @param data - the Data Item to upload
   *
   * @returns
   * id - The Arweave tx-id of the uploaded data
   * timestamp
   * signature
   * owner
   */
  return async (data) => {
    return of(data)
      .chain(
        fromPromise(async (body) => {
          // Fire HB upload in parallel — never blocks or fails the main flow
          const hbUrl = `${HB_GRAPHQL_URL}/id?codec-device=ans104@1.0`
          logger.tap({ log: `[uploader] Forwarding to HB: ${hbUrl}` })()
          dataItemFetch(hbUrl, { method: 'POST', body })
            .then((res) => res.text())
            .then((text) => logger.tap({ log: `[uploader] HB response: ${text}` })())
            .catch((err) => logger.tap({ log: `[uploader] HB upload error (non-fatal): ${err.message}` })())

          // Arweave upload — this is the one we await and return
          logger.tap({ log: `[uploader] Forwarding to Arweave: ${UPLOADER_URL}/tx/arweave` })()
          return dataItemFetch(`${UPLOADER_URL}/tx/arweave`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Accept: 'application/json'
            },
            body
          })
        })
      )
      .bimap(logger.tap({ log: '[uploader] Error communicating with Arweave uploader:' }), identity)
      .bichain(
        (err) => Rejected(JSON.stringify(err)),
        fromPromise(async (res) => {
          if (!res?.ok) {
            const text = await res.text()
            logger.tap({ log: `[uploader] Arweave upload failed: ${res.status} ${text}` })()
            throw new Error(`${res.status}: ${text}`)
          }
          const json = await res.json()
          logger.tap({ log: `[uploader] Arweave upload succeeded: ${json.id}` })()
          return json
        })
      )
      .toPromise()
  }
}

export default {
  uploadDataItemWith
}
