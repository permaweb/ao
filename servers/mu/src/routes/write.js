import express from 'express'
const router = express.Router()

// begin an async task to crank all the messages on an initial interaction
router.post('', async (req, res) => {
  console.log(req.domain)
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

  // dont wait for cranking process to finish to reply to users crank call
  const instance = msgProcessor.init({ db, cuClient, sequencerClient })
  instance.process(tx)

  res.send({
    response: {
      message: `Processing tx: ${txid}`
    }
  })
})

export default router
