const express = require('express');
const { readState } = require('@permaweb/ao-sdk');

const router = express.Router();

// read the latest state on the contract
router.get('/:id', async (req, res) => {
    const contractId = req.params.id;

    if(!contractId) {
        throw new Error(`Please pass a contract id as query parameter`);
    }

    try {
        res.send(await readState(contractId));
    } catch (e) {
        throw new Error(`Failed to read state with error: ${e}`);
    }
});

module.exports = router;