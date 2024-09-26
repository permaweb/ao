import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'
import { backoff, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function writeDataItemWith ({ fetch, histogram, logger }) {
  const suFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeDataItem'
    }),
    logger
  })
  const suRedirectFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeDataItemWithRedirect'
    }),
    logger
  })
  /**
   * writeDataItem
   * Given a dataItem and a suUrl, forward the message to the SU
   * to be posted to Arweave.
   *
   * @param data - the data to forward
   * @param suUrl - the SU to forward the data to
   * @param logId - The logId to aggregate the logs by
   *
   * @returns
   * id - the tx-id of the data item
   * timestamp
   */
  return async ({ data, suUrl, logId }) => {
    return of(Buffer.from(data, 'base64'))
      .map(logger.tap({ log: `Forwarding message to SU ${suUrl}`, logId }))
      .chain(
        fromPromise((body) =>
          suFetch(suUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Accept: 'application/json'
            },
            redirect: 'manual',
            body
          }).then(async (response) => {
            /*
            After upgrading to node 22 we have to handle
            the redirects manually otherwise fetch throws
            an error
          */
            if ([307, 308].includes(response.status)) {
              const newUrl = response.headers.get('Location')
              return suRedirectFetch(newUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                },
                body
              })
            }
            return response
          })
        )
      )
      .bimap((e) => {
        logger({ log: `Error while communicating with SU: ${e}`, logId })
        return e
      }, identity)
      .bichain(
        (err) => Rejected(err),
        fromPromise(async (res) => {
          if (!res?.ok) {
            const text = await res.text()
            throw new Error(`${res.status}: ${text}`)
          }
          return res.json()
        })
      )
      .map(logger.tap({ log: 'Successfully forwarded DataItem to SU', logId }))
      .toPromise()
  }
}

function writeAssignmentWith ({ fetch, histogram, logger }) {
  const suFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeAssignment'
    }),
    logger
  })
  const suRedirectFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeAssignmentWithRedirect'
    }),
    logger
  })

  /**
   * writeAssignment
   * Forward an assignment to the SU
   *
   * @param txId - the tx-id of the message to assign
   * @param processId - the process to assign the message to
   * @param baseLayer - whether the assignment is part of an L1 transaction
   * @param exclude - fields to exclude during the assignment
   * @param suUrl - the SU to forward the assign to
   * @param logId - The logId to aggregate the logs by
   */
  return async ({ txId, processId, baseLayer, exclude, suUrl, logId }) => {
    return of({ txId, processId, baseLayer, exclude, suUrl, logId })
      .map(logger.tap({ log: `Forwarding Assignment to SU ${suUrl}`, logId }))
      .chain(
        fromPromise(({ txId, processId, baseLayer, exclude, suUrl }) => {
          let url = `${suUrl}/?process-id=${processId}&assign=${txId}`
          // aop2 base-layer param
          if (baseLayer === '') {
            url += '&base-layer'
          }
          // aop1 exclude param
          if (exclude) {
            url += `&exclude=${exclude}`
          }

          return backoff(
            () =>
              suFetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                },
                redirect: 'manual'
              }).then((res) => {
                return okRes(res)
              }),
            {
              maxRetries: 5,
              delay: 500,
              log: logger,
              logId,
              name: `forwardAssignment(${JSON.stringify({
                suUrl,
                processId,
                txId
              })})`
            }
          ).then((response) => {
            if ([307, 308].includes(response.status)) {
              const newUrl = response.headers.get('Location')
              return suRedirectFetch(newUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  Accept: 'application/json'
                }
              })
            }
            return response
          })
        })
      )
      .chain(
        fromPromise(async (res) => {
          if (!res?.ok) {
            const text = await res.text()
            throw new Error(`${res.status}: ${text}`)
          }
          return res.json()
        })
      )
      .bimap(
        (e) => {
          logger({ log: 'Error while communicating with SU:', logId })
          return new Error(e)
        },
        logger.tap({ log: 'Successfully forwarded Assignment to SU', logId })
      )
      .toPromise()
  }
}

function fetchSchedulerProcessWith ({
  fetch,
  histogram,
  logger,
  setByProcess,
  getByProcess
}) {
  const suFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeAssignmentWithRedirect'
    }),
    logger
  })

  /**
   * fetchSchedulerProcess
   * Given a processId and a suUrl, find process information
   * in the cache or fetch it from the SU.
   *
   * @param {string} processId - The processId of to retrieve information of
   * @param {string} suUrl - The SU location to fetch the information from
   * @param {string} logId - The logId to aggregate the logs by
   *
   * @returns
   * processId
   * block - the block number of the process
   * owner - the key and address of the process owner
   * tags
   * data
   * anchor
   * epoch
   * nonce
   * signature
   *
   */
  return (processId, suUrl, logId) => {
    return getByProcess(processId)
      .then((cached) => {
        if (cached) {
          logger({ log: `cached process found ${processId}`, logId })
          return cached
        }

        logger({ log: `${suUrl}/processes/${processId}`, logId })

        return suFetch(`${suUrl}/processes/${processId}`)
          .then((res) => res.json())
          .then((res) => {
            if (res) {
              return setByProcess(processId, res).then(() => res)
            }
          })
      })
      .catch((e) => {
        logger({ log: `error fetching process ${e}`, logId })
      })
  }
}

export default {
  writeDataItemWith,
  writeAssignmentWith,
  fetchSchedulerProcessWith
}
