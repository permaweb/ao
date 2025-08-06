import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'
import { backoff, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'
import { connect, createDataItemSigner } from '@permaweb/aoconnect'

function writeDataItemWith ({ fetch, histogram, logger, wallet }) {
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
  return async ({ data, suUrl, logId, schedulerType = 'legacy', processId, id, tags = [], dataStr }) => {
    const endpoint = schedulerType === 'hyperbeam'
      ? `${suUrl}/${processId}~process@1.0/push`
      : suUrl
    const fetchClient = schedulerType === 'hyperbeam' ? hbFetch : suFetch

    return of(Buffer.from(data, 'base64'))
      .map(logger.tap({
        log: `Forwarding message to ${schedulerType} scheduler ${endpoint}`,
        logId
      }))
      .chain(
        fromPromise((body) => {
          if (schedulerType === 'hyperbeam') {
            // Use ao connect for HyperBeam push requests
            const aoConnect = connect({
              MODE: 'mainnet',
              device: 'process@1.0',
              signer: createDataItemSigner(wallet),
              URL: suUrl
            })

            // Helper function to convert tags array to object (like assoc in mainnet.js)
            const tagsToObj = tags.reduce((acc, tag) => {
              acc[tag.name] = tag.value
              return acc
            }, {})

            // Create push request parameters following mainnet.js pattern
            let pushParams = {}
            if (tagsToObj.Type === 'Process') {
              pushParams = {
                path: '/push',
                method: 'POST',
                Type: 'Process',
                device: 'process@1.0',
                'scheduler-device': 'scheduler@1.0',
                'push-device': 'push@1.0',
                'scheduler-location': tagsToObj.Scheduler,
                'data-protocol': 'ao',
                variant: 'ao.N.1',
                ...tagsToObj,
                Authority: tagsToObj.Scheduler,
                'accept-bundle': 'true',
                signingFormat: 'ANS-104'
              }
            } else {
              pushParams = {
                type: 'Message',
                path: `/${processId}~process@1.0/push`,
                method: 'POST',
                ...tagsToObj,
                'data-protocol': 'ao',
                'scheduler-device': 'scheduler@1.0',
                'push-device': 'push@1.0',
                variant: 'ao.N.1',
                target: processId,
                signingFormat: 'ANS-104',
                'accept-bundle': 'true',
                'accept-codec': 'httpsig@1.0',
                data: dataStr
              }
            }

            return aoConnect.request(pushParams)
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

function fetchHyperBeamResultWith ({ fetch, histogram, logger }) {
  const hbFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'fetchHyperBeamResult'
    }),
    logger
  })

  /**
   * fetchHyperBeamResult
   * Fetches result from HyperBeam scheduler using the new endpoint format
   *
   * @param {string} processId - The process ID
   * @param {string} suUrl - The HyperBeam scheduler URL
   * @param {string} assignmentNum - The assignment/slot number
   * @param {string} logId - The logId to aggregate the logs by
   *
   * @returns result data from HyperBeam scheduler
   */
  return async ({ processId, suUrl, assignmentNum, logId }) => {
    const resultUrl = `${suUrl}/${processId}~process@1.0/compute&slot=${assignmentNum}/results/serialize~json@1.0`

    logger({ log: `Fetching result from HyperBeam: ${resultUrl}`, logId })

    return backoff(
      () => hbFetch(resultUrl).then((res) => okRes(res)),
      {
        maxRetries: 5,
        delay: 500,
        log: logger,
        logId,
        name: `fetchHyperBeamResult(${processId}, ${assignmentNum})`
      }
    )
      .then(async (res) => {
        if (!res?.ok) {
          const text = await res.text()
          throw new Error(`${res.status}: ${text}`)
        }
        return res.json()
      })
      .then((res) => {
      // Parse result so that MU can use it
        const result = JSON.parse(res.json.body)
        // Attach isHyperBeamResult to result
        return { ...result, isHyperBeamResult: true }
      })
      .then((result) => {
        logger({ log: 'Successfully fetched result from HyperBeam scheduler', logId })
        return result
      })
      .catch((e) => {
        logger({ log: `Error fetching result from HyperBeam scheduler: ${e}`, logId })
        throw e
      })
  }
}

export default {
  writeDataItemWith,
  writeAssignmentWith,
  fetchSchedulerProcessWith,
  fetchHyperBeamResultWith
}
