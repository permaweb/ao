import express from "express"

const router = express.Router()

// read the latest state on the contract
router.get("/:id", async (req, res, next) => {
  const { readState } = req.domain
  const contractId = req.params.id

  try {
    res.send(await readState(contractId))
  } catch (e) {
    next(new Error(`Failed to read state with error: ${e}`))
  }
})

export default router
