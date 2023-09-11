const express = require('express');
const router = express.Router();

router.get('', async (req, res) => {
    res.send(`ao dre node`);
});

module.exports = router;