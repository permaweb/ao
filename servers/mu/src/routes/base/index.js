import express from 'express'
const router = express.Router()

router.get('', async (req, res) => {
  res.send('ao messenger unit')
})

export default router
