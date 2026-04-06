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
  const hbFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeDataItemHyperBeam'
    }),
    logger
  })
  /**
   * writeDataItem
   * Given a dataItem and a suUrl, forward the message to the SU or HyperBeam scheduler
   * to be posted to Arweave.
   *
   * @param data - the data to forward
   * @param suUrl - the SU or HyperBeam scheduler URL
   * @param logId - The logId to aggregate the logs by
   * @param schedulerType - 'legacy' or 'hyperbeam' to determine endpoint
   *
   * @returns
   * id - the tx-id of the data item
   * timestamp
   */
  return async ({ data, suUrl, logId, schedulerType = 'legacy', schedulerAddress, processId, id, tags = [], dataStr }) => {
    const endpoint = schedulerType === 'hyperbeam'
      ? `${suUrl}/~scheduler@1.0/schedule`
      : suUrl
    const fetchClient = schedulerType === 'hyperbeam' ? hbFetch : suFetch

    return of(Buffer.from(data, 'base64'))
      .map(logger.tap({
        log: `Forwarding message to ${schedulerType} scheduler ${endpoint}`,
        logId
      }))
      .chain(
        fromPromise(async (body) => {
          if (schedulerType === 'hyperbeam') {
            return hbFetch(`${suUrl}/${processId}/~scheduler@1.0/schedule`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/ans104',
                'codec-device': 'ans104@1.0'
              },
              body
            })
          } else {
            return fetchClient(endpoint, {
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
          }
        })
      )
      .bimap((e) => {
        logger({ log: `Error while communicating with SU: ${e}`, logId })
        return e
      }, identity)
      .bichain(
        (err) => Rejected(err),
        fromPromise(async (res) => {
          if (schedulerType === 'hyperbeam') {
            if (+res.status === 200) {
              // TODO: fix this
              return { id, timestamp: Date.now(), slot: +res.slot, process: res?.process }
            }
            throw new Error(`${res.status}: Error posting to HyperBeam`)
          }
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

function fetchTransactionDetailsWith ({
  fetch,
  histogram,
  logger,
  locate
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
   * fetchTransactionDetailsWith
   * Given a processId, an optional messagId and a su location function, find transaction info
   * from the SU
   *
   * @param {string} processId - The processId of to retrieve information of
   * @param {string} messageId - The messageId
   * @param {string} logId - The logId to aggregate the logs by
   *
   */
  return async ({ processId, messageId }) => {
    return locate(processId)
      .then(async (scheduler) => {
        const url = messageId
          ? `${scheduler.url}/${messageId}?process-id=${processId}`
          : `${scheduler.url}/processes/${processId}`

        return suFetch(url)
          .then((res) => res.json())
          .then((res) => {
            if (res.message) {
              const blockTag = res.assignment.tags.find(
                (t) => t.name === 'Block-Height'
              )

              return {
                process_id: res.message.target,
                owner: res.message.owner.address,
                block: parseInt(blockTag.value, 10)
              }
            } else if (res.process_id) {
              return {
                process_id: res.process_id,
                owner: res.owner.address,
                block: parseInt(res.block, 10)
              }
            }
          })
      })
      .catch((e) => {
        logger({ log: `error fetching transction ${e}` })
      })
  }
}

export default {
  writeDataItemWith,
  writeAssignmentWith,
  fetchSchedulerProcessWith,
  fetchTransactionDetailsWith
}
