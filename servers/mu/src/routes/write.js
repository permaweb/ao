import express from 'express'

import msgProcessor from '../messages/processor.js'
import validate from '../validation/write.js'

import pouchDbClient from '../clients/pouchdb.js'
import createLogger from '../logger.js'
const router = express.Router()

const logger = createLogger('@permaweb/ao/servers/mu')

// begin an async task to crank all the messages on an initial interaction
router.post('', async (req, res) => {
  validate(req.body)
  const { txid, cid, data } = req.body

  const db = {
    saveTx: pouchDbClient.saveTxWith({ pouchDb: pouchDbClient.pouchDb, logger }),
    findLatestTx: pouchDbClient.findLatestTxWith({ pouchDb: pouchDbClient.pouchDb }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: pouchDbClient.pouchDb, logger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: pouchDbClient.pouchDb }),
    updateMsg: pouchDbClient.updateMsgWith({ pouchDb: pouchDbClient.pouchDb, logger })
  }

  const tx = { txId: txid, contractId: cid, data }

  // dont wait for cranking process to finish to reply to users crank call
  const instance = msgProcessor.init()
  instance.process(tx, db)

  res.send({
    response: {
      message: `Processing tx: ${txid}`
    }
  })
})

export default router
