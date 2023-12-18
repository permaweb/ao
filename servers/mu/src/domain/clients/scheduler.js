import { identity } from 'ramda'

import { of, fromPromise, Rejected } from 'hyper-async'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

function writeMessageWith ({ fetch, SCHEDULER_URL, logger }) {
  return async (data) => {
    return of(Buffer.from(data, 'base64'))
      .map(logger.tap(`Forwarding message to SU ${SCHEDULER_URL}`))
      .chain(fromPromise((body) =>
        fetch(`${SCHEDULER_URL}/message`, {
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

function writeProcessTxWith ({ SCHEDULER_URL, MU_WALLET }) {
  return async ({ initState, src, tags }) => {
    const { spawnProcess } = connect({ SU_URL: SCHEDULER_URL })

    const processId = await spawnProcess({
      srcId: src,
      initialState: initState,
      signer: createDataItemSigner(MU_WALLET),
      tags
    })

    return processId
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
  writeMessageWith,
  writeProcessTxWith,
  fetchSequencerProcessWith
}
