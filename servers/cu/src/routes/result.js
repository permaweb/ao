import express from 'express'

const router = express.Router()

// read the messages for a given tx id
router.get('/:tx', async (req, res) => {
  const { readState } = req.domain
  const txId = req.params.tx

  if (!txId) {
    throw new Error('Please pass a tx as query parameter')
  }

  try {
    const gatewayFetch = await fetch(`https://gateway.warp.cc/gateway/interactions/${txId}`)
    const gatewayData = await gatewayFetch.json()
    const sortkey = gatewayData.sortkey
    const contractId = gatewayData.contractid
    const txState = await readState(contractId, sortkey)
    if ('result' in txState) {
      res.send(txState.result)
    } else {
      res.send({})
    }
  } catch (e) {
    throw new Error(`Failed to read messages with error: ${e}`)
  }
})

export default router
