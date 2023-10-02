import express from 'express'
const router = express.Router()

// begin an async task to crank all the messages on an initial interaction
router.post('', async (req, res) => {
  const {
    db,
    msgProcessor,
    validateWrite,
    cuClient,
    sequencerClient
  } = req.domain

  const { txid, cid, data } = req.body

  validateWrite(req.body)

  const tx = { txId: txid, contractId: cid, data }

  const instance = msgProcessor.init({ db, cuClient, sequencerClient })

  // async process to crank messages
  instance.process(tx)

  res.send({
    response: {
      message: `Processing tx: ${txid}`
    }
  })
})

export default router
