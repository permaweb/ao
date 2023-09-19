const express = require('express');
const router = express.Router();

const { readState } = require('@permaweb/ao-sdk');

// read the messages for a given tx id
router.get('/:tx', async (req, res) => {
    const txId = req.params.tx;

    if(!txId) {
        throw new Error(`Please pass a tx as query parameter`);
    }

    try {
        let gatewayFetch = await fetch(`https://gateway.warp.cc/gateway/interactions/${txId}`);
        let gatewayData = await gatewayFetch.json();
        let sortkey= gatewayData['sortkey'];
        let contractId = gatewayData['contractid'];
        let txState = await readState(contractId, sortkey);
        if('result' in txState) {
            res.send(txState['result']);
        } else {
            res.send({});
        }
    } catch(e) {
        throw new Error(`Failed to read messages with error: ${e}`);
    }
});

module.exports = router;