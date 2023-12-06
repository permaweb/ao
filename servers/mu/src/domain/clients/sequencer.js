import { identity } from 'ramda'

import { of, fromPromise, Rejected } from 'hyper-async'

import { connect, createDataItemSigner } from '@permaweb/ao-sdk'

function writeMessageWith ({ fetch, SEQUENCER_URL, logger }) {
  return async (data) => {
    return of(Buffer.from(data, 'base64'))
      .map(logger.tap(`Forwarding message to SU ${SEQUENCER_URL}`))
      .chain(fromPromise((body) =>
        fetch(`${SEQUENCER_URL}/message`, {
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

function writeProcessTxWith ({ SEQUENCER_URL, MU_WALLET }) {
  return async ({ initState, src, tags }) => {
    const { spawnProcess } = connect({ SU_URL: SEQUENCER_URL })

    const processId = await spawnProcess({
      srcId: src,
      initialState: initState,
      signer: createDataItemSigner(MU_WALLET),
      tags
    })

    return processId
  }
}

function fetchSequencerProcessWith ({ SEQUENCER_URL, logger }) {
  return async (processId) => {
    logger(`${SEQUENCER_URL}/processes/${processId}`)

    return fetch(`${SEQUENCER_URL}/processes/${processId}`)
      .then(res => res.json())
      .then(res => res || {})
  }
}

export default {
  writeMessageWith,
  writeProcessTxWith,
  fetchSequencerProcessWith
}
