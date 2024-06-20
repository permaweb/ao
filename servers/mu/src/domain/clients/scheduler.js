import { identity } from 'ramda'
import { of, fromPromise, Rejected } from 'hyper-async'

const okRes = (res) => {
  if (res.ok) return res
  throw res
}
export const backoff = (
  fn,
  { maxRetries = 3, delay = 500, log, name }
) => {
  /**
   * Recursive function that recurses with exponential backoff
   */
  console.log('BACKOFF')
  const action = (retry, delay) => {
    return Promise.resolve()
      .then(fn)
      .catch((err) => {
        console.log('BACKOFF ERROR')
        // Reached max number of retries
        if (retry >= maxRetries) {
          log(`(${name}) Reached max number of retries: ${maxRetries}. Bubbling err`)
          return Promise.reject(err)
        }

        const newRetry = retry + 1
        const newDelay = delay + delay
        log(`(${name}) Backing off -- retry ${newRetry} starting in ${newDelay} milliseconds...`)
        return new Promise((resolve, reject) =>
          setTimeout(
          /**
           * increment the retry count Retry with an exponential backoff
           */
            () => action(newRetry, newDelay).then(resolve).catch(reject),
            /**
             * Retry in {delay} milliseconds
             */
            delay
          )
        )
      })
  }

  return action(0, delay)
}
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
          redirect: 'manual',
          body
        }).then(async response => {
          /*
            After upgrading to node 22 we have to handle
            the redirects manually otherwise fetch throws
            an error
          */
          if ([307, 308].includes(response.status)) {
            const newUrl = response.headers.get('Location')
            return fetch(newUrl, {
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

        console.log({ url })
        return backoff(
          () => fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              Accept: 'application/json'
            },
            redirect: 'manual'
          }).then((res) => {
            console.log('BACKOFF RES', { res })
            return okRes(res)
          }),
          { maxRetries: 5, delay: 500, log: logger, name: `forwardAssignment(${JSON.stringify({ suUrl, processId, txId })})` }
        ).then(response => {
          console.log({ response })
          if ([307, 308].includes(response.status)) {
            const newUrl = response.headers.get('Location')
            return fetch(newUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
              }
            })
          }
          return response
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
          console.log({ suRes: res })
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
    console.log('abc2', { processId, suUrl, fetch: fetch.toString() })
    return getByProcess(processId)
      .then(cached => {
        console.log('abc3', { cached })
        if (cached) {
          logger(`cached process found ${processId}`)
          return cached
        }

        logger(`${suUrl}/processes/${processId}`)
        // suUrl = 'http://localhost:9000'
        return fetch(`${suUrl}/processes/${processId}`)
          .then(res => res.json())
          .then(res => {
            console.log('abc4', { res })
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
