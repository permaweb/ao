const express = require('express');
const router = express.Router();

const msgProcessor = require('../messages/processor');
let cuClient = require('../clients/cu');

// begin an async task to crank all the messages on an initial interaction
router.post('/:tx', async (req, res) => {
    const txId = req.params.tx;
    const cuAddress = req.body.cu;

    if(!txId) {
        throw new Error(`Please pass a tx as query parameter`);
    }

    let messages = await cuClient.messages(cuAddress, txId);

    if(!messages) {
        throw new Error(`No messages to crank for this transaction`);
    }

    // dont wait for cranking process to finish to reply to users crank call
    (async () => {
        return new Promise((resolve) => {
            msgProcessor.process(txId, messages, cuAddress).then(() => {
                resolve();
            });
        });
    })().then(() => {
        console.log(`Finished callstack for txId: ${txId}`);
    });

    res.send({response: `Cranking messages for tx: ${txId}`});
});

module.exports = router;