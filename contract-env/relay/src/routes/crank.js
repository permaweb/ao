const express = require('express');
const router = express.Router();

const msgProcessor = require('../messages/processor');
let dreClient = require('../clients/dre');

// begin an async task to crank all the messages on an initial interaction
router.post('/:tx', async (req, res) => {
    const txId = req.params.tx;
    const dreNode = req.body.dre;

    if(!txId) {
        throw new Error(`Please pass a tx as query parameter`);
    }

    let messages = await dreClient.messages(dreNode, txId);

    if(!messages) {
        throw new Error(`No messages to crank for this transaction`);
    }

    // dont wait for cranking process to finish to reply to users crank call
    (async () => {
        return new Promise((resolve) => {
            // msgProcessor.process(txId, messages, dreNode).then(() => {
            //     resolve();
            // });
        });
    })().then(() => {
        console.log(`Finished callstack for txId: ${txId}`);
    });

    res.send({response: `Cranking messages for tx: ${txId}`});
});

module.exports = router;