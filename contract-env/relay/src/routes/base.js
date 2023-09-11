const express = require('express');
const router = express.Router();

router.get('', async (req, res) => {
    res.send(`ao relay node`);
});

module.exports = router;