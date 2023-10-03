import express from 'express'

import validate from './validate.js'
const router = express.Router()

router.get('/:id', async (req, res) => {
  validate(req)
  res.send('ao trace')
})

export default router
