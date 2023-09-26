import cuClient from '../clients/cu.js'
import sequencerClient from '../clients/sequencer.js'

const processor = {
  ongoingCalls: 0,
  db: null,
  initialTxId: null,

  init: function () {
    return {
      ...this,
      ongoingCalls: 0,
      db: null,
      initialTxId: null
    }
  },

  checkCompletion: function () {
    if (this.ongoingCalls === 0) {
      console.log('All recursive calls completed.')
      this.cleanProcess()
    }
  },

  cleanProcess: function () {
    console.log(`Cleaning process for txId ${this.initialTxId}`)
  },

  // process a single transaction
  process: async function (tx, db) {
    this.db = db
    this.initialTxId = tx.txId

    await this.checkAndWriteTx(tx)

    const cuAddress = await cuClient.selectNode(tx.contractId)

    const msgs = await this.fetchAndSaveMsgs(tx.txId, cuAddress)
    msgs.forEach(msg => this.msgRecurse(msg, cuAddress))
  },

  // we recurse on a saved database message
  msgRecurse: async function (msg, cuAddress) {
    this.ongoingCalls++

    try {
      let newTxId

      // if theres no toTxId it was never sent to the sequencer, so send it
      if (!msg.toTxId) {
        const message = msg.msg

        const dataItem = await sequencerClient.buildAndSign(
          message.target,
          {
            function: 'handleMessage',
            message: message.message
          }
        )

        newTxId = await dataItem.id

        await this.checkAndWriteTx({
          txId: newTxId,
          data: dataItem.getRaw(),
          contractId: message.target
        })

        await this.db.updateMsg({ _id: msg.id, toTxId: newTxId })
      } else {
        newTxId = msg.toTxId
      }

      const msgs = await this.fetchAndSaveMsgs(newTxId, cuAddress)
      msgs.forEach(msg => this.msgRecurse(msg, cuAddress))
    } catch (err) {
      console.error('Error in msgRecurse:', err)
    } finally {
      this.ongoingCalls--
      this.checkCompletion()
    }
  },

  // fetch messages from the cu and save them if not already saved
  fetchAndSaveMsgs: async function (txId, cuAddress) {
    const existingMsgs = await this.db.findLatestMsgs({ fromTxId: txId })

    if (existingMsgs.length === 0) {
      const msgs = await cuClient.messages(cuAddress, txId)

      // save all the messages for the initial tx
      await Promise.all(
        msgs.map(async (msg) => {
          await this.db.saveMsg({
            id: Math.floor(Math.random() * 1e18).toString(),
            fromTxId: txId,
            msg,
            cachedAt: new Date()
          })
        })
      )
    }

    return await this.db.findLatestMsgs({ fromTxId: txId })
  },

  checkAndWriteTx: async function (tx) {
    const existingTx = await this.db.findLatestTx({ id: tx.txId })

    if (!existingTx) {
      await this.db.saveTx({
        txId: tx.txId,
        contractId: tx.contractId,
        data: tx.data.toString('base64'),
        cachedAt: new Date()
      })
    }

    const exists = await sequencerClient.txExists(tx.txId)
    if (!exists) {
      await sequencerClient.writeInteraction(tx.data)
    }
  }
}

export default processor
