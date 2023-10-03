import pkg from 'warp-arbundles'
import config from '../../config.js'
const { createData, ArweaveSigner } = pkg

function writeInteractionWith ({ SEQUENCER_URL }) {
  return async (data) => {
    const rawDataBuffer = Buffer.from(data, 'base64')

    const response = await fetch(
                `${SEQUENCER_URL}/gateway/v2/sequencer/register`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    Accept: 'application/json'
                  },
                  body: rawDataBuffer
                }
    )

    return await getJsonResponse(response)
  }
}

async function getJsonResponse (response) {
  let r
  try {
    r = await response
  } catch (e) {
    throw new Error(
          `Error while communicating with sequencer: ${JSON.stringify(e)}`
    )
  }

  if (!r?.ok) {
    const text = await r.text()
    console.log(text)
    throw new Error(`${r.status}: ${text}`)
  }
  const result = await r.json()
  return result
}

function buildAndSignWith () {
  return async (contractId, input) => {
    const data = Math.random().toString().slice(-4)
    const signer = new ArweaveSigner(config.muWallet)

    const tags = []
    tags.push({ name: 'App-Name', value: 'SmartWeaveAction' })
    tags.push({ name: 'App-Version', value: '0.3.0' })
    tags.push({ name: 'Contract', value: contractId })
    tags.push({ name: 'Input', value: JSON.stringify(input) })
    tags.push({ name: 'SDK', value: 'ao' })

    const interactionDataItem = createData(data, signer, { tags })
    await interactionDataItem.sign(signer)
    return {
      id: await interactionDataItem.id,
      data: interactionDataItem.getRaw(),
      contractId
    }
  }
}

// TODO: implement find query
function findTxWith ({ SEQUENCER_URL }) {
  console.log(SEQUENCER_URL)
  return async (txId) => {
    console.log('Searching for tx on sequencer')
    console.log(txId)
    return Promise.reject(new Error('Tx not found on sequencer'))
  }
}

export default {
  writeInteractionWith,
  buildAndSignWith,
  findTxWith
}
