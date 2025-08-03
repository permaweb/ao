import { always, compose } from 'ramda'
import { z } from 'zod'

import { withErrorHandler } from './middleware/withErrorHandler.js'
import { withCuMode } from './middleware/withCuMode.js'
import { withProcessRestrictionFromPath } from './middleware/withProcessRestriction.js'
import { withMetrics } from './middleware/withMetrics.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required')
})

export const withSnapshotRoutes = (app) => {
  app.post(
    '/snapshot/:processId',
    compose(
      withErrorHandler,
      withCuMode,
      withProcessRestrictionFromPath,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.params.processId }) }),
      always(async (req, res) => {
        const {
          params: { processId },
          domain: { apis: { forceSnapshot } },
          logger
        } = req

        const input = inputSchema.parse({ processId })

        logger('Snapshot request received for process: %s', input.processId)

        const result = await forceSnapshot(input)

        if (result.success && result.snapshot) {
          // Set critical sync information in headers for easier access
          res.header('snapshot-timestamp', String(result.snapshot.timestamp))
          res.header('snapshot-ordinate', result.snapshot.ordinate)
          res.header('snapshot-block-height', String(result.snapshot.blockHeight))
          res.header('snapshot-module-id', result.snapshot.moduleId)
          if (result.snapshot.nonce) {
            res.header('snapshot-nonce', String(result.snapshot.nonce))
          }
          if (result.snapshot.epoch) {
            res.header('snapshot-epoch', String(result.snapshot.epoch))
          }
          if (result.snapshot.hashChain) {
            res.header('snapshot-hash-chain', result.snapshot.hashChain)
          }
          res.status(200).send(result)
        } else {
          res.status(404).send(result)
        }
      })
    )()
  )

  return app
}
