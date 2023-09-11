const express = require('express');
const router = express.Router();

// begin an async task to crank all the messages on an initial interaction
router.get('/:tx', async (req, res) => {
    const txId = req.params.tx;

    if(!txId) {
        throw new Error(`Please pass a tx as query parameter`);
    }

    res.send(`Messages for: ${txId}`);
});

module.exports = router;