const processor = {
  ongoingCalls: 0,
  db: null,
  initialTxId: null,
  cuClient: null,
  sequencerClient: null,

  init: function (env) {
    return {
      ...this,
      ongoingCalls: 0,
      db: env.db,
      initialTxId: null,
      cuClient: env.cuClient,
      sequencerClient: env.sequencerClient
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
  process: async function (tx) {
    this.initialTxId = tx.txId

    await this.checkAndWriteTx(tx)

    const cuAddress = await this.cuClient.selectNode(tx.contractId)

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

        const dataItem = await this.sequencerClient.buildAndSign(
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
      const msgs = await this.cuClient.messages(cuAddress, txId)

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

    const exists = await this.sequencerClient.txExists(tx.txId)
    if (!exists) {
      await this.sequencerClient.writeInteraction(tx.data)
    }
  }
}

export default processor
