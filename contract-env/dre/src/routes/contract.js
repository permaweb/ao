const express = require('express');
const router = express.Router();

// begin an async task to crank all the messages on an initial interaction
router.get('/:id', async (req, res) => {
    const contractId = req.params.id;

    if(!contractId) {
        throw new Error(`Please pass a contract id as query parameter`);
    }

    res.send(`State for: ${contractId}`);
});

module.exports = router;