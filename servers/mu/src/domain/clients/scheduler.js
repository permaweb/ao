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
    })
  })
  const suRedirectFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeDataItemWithRedirect'
    })
  })
  return async ({ data, suUrl }) => {
    return of(Buffer.from(data, 'base64'))
      .map(logger.tap(`Forwarding message to SU ${suUrl}`))
      .chain(
        fromPromise((body) =>
          backoff(
            () => suFetch(suUrl, {
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
            }),
            {
              maxRetries: 5,
              delay: 500,
              log: logger,
              name: `writeDataItem(${JSON.stringify({
                suUrl
              })})`
            })
        )
      )
      .bimap(logger.tap('Error while communicating with SU:'), identity)
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
      .map(logger.tap('Successfully forwarded DataItem to SU'))
      .toPromise()
  }
}

function writeAssignmentWith ({ fetch, histogram, logger }) {
  const suFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeAssignment'
    })
  })
  const suRedirectFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'writeAssignmentWithRedirect'
    })
  })
  return async ({ txId, processId, baseLayer, exclude, suUrl }) => {
    return of({ txId, processId, baseLayer, exclude, suUrl })
      .map(logger.tap(`Forwarding Assignment to SU ${suUrl}`))
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
              name: `writeAssignment(${JSON.stringify({
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
          logger.tap('Error while communicating with SU:')(e)
          return new Error(e)
        },
        logger.tap('Successfully forwarded Assignment to SU')
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
    })
  })
  return (processId, suUrl) => {
    return getByProcess(processId)
      .then((cached) => {
        if (cached) {
          logger(`cached process found ${processId}`)
          return cached
        }

        logger(`${suUrl}/processes/${processId}`)

        return suFetch(`${suUrl}/processes/${processId}`)
          .then((res) => res.json())
          .then((res) => {
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
