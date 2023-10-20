import express from 'express'
import { of } from 'hyper-async'
import validate from './validate.js'

const router = express.Router()

// begin an async task to crank all the messages on an initial interaction
router.post('', async (req, res) => {
  const {
    initMsgs,
    crankMsgs
  } = req.domain

  const { txid, cid, data } = req.body

  validate(req.body);

  (async () => {
    return new Promise((resolve) => {
      of({ tx: { id: txid, contractId: cid, data } })
        .chain(initMsgs)
        .toPromise().then(result => {
          of({ msgs: result.msgs, spawns: result.spawns })
            .chain(crankMsgs)
            .toPromise().then(result2 => {
              resolve()
            })
        })
    })
  })().then(() => {
    console.log(`Finished callstack for txId: ${txid}`)
  })

  res.send({
    response: {
      message: `Processing tx: ${txid}`
    }
  })
})

export default router
