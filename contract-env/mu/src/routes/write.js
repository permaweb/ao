const express = require('express');
const router = express.Router();

const msgProcessor = require('../messages/processor');
const cuClient = require('../clients/cu');
const sequencerClient = require('../clients/sequencer');
const validate = require('../validation/write')

// begin an async task to crank all the messages on an initial interaction
router.post('', async (req, res) => {
    validate(req.body);
    const { id, data, cu } = req.body;

    let initialTxJson = await sequencerClient.writeInteraction(data);

    let messages = await cuClient.messages(cu, id);

    if(!messages) {
        throw new Error(`No messages to crank for this transaction`);
    }

    // dont wait for cranking process to finish to reply to users crank call
    (async () => {
        return new Promise((resolve) => {
            msgProcessor.process(id, messages, cu).then(() => {
                resolve();
            });
        });
    })().then(() => {
        console.log(`Finished callstack for txId: ${id}`);
    });

    res.send({
        response: {
            message: `Cranking messages for tx: ${id}`, 
            tx: initialTxJson
        }
    });
});

module.exports = router;