const express = require('express');
const router = express.Router();

router.get('', async (req, res) => {
    res.send(`ao messenger unit`);
});

module.exports = router;