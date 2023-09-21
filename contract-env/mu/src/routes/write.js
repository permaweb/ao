const express = require('express');
const router = express.Router();

const msgProcessor = require('../messages/processor');
const validate = require('../validation/write')

// begin an async task to crank all the messages on an initial interaction
router.post('', async (req, res) => {
    validate(req.body);
    const { id, data, cu } = req.body;

    // dont wait for cranking process to finish to reply to users crank call
    (async () => {
        return new Promise((resolve) => {
            msgProcessor.process(id, data, cu).then(() => {
                resolve();
            });
        });
    })().then(() => {
        console.log(`Finished callstack for txId: ${id}`);
    });

    res.send({
        response: {
            message: `Processing tx: ${id}`
        }
    });
});

module.exports = router;