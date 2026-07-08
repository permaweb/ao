import { always, compose } from 'ramda'
import { z } from 'zod'

import { withMetrics, withMiddleware, withProcessRestrictionFromPath, withCuMode } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required')
})

const stopReadStateRoute = compose(
  withMiddleware,
  withCuMode,
  withProcessRestrictionFromPath,
  withMetrics({ tracesFrom: (req) => ({ process_id: req.params.processId }) }),
  always(async (req, res) => {
    const {
      params: { processId },
      domain: { apis: { stopReadState } }
    } = req

    const input = inputSchema.parse({ processId })

    await stopReadState(input)
      .map((result) => res.send(result))
      .toPromise()
  })
)()

export const withStopRoutes = (app) => {
  app.get('/stop/:processId', stopReadStateRoute)
  app.post('/stop/:processId', stopReadStateRoute)
  app.delete('/stop/:processId', stopReadStateRoute)

  return app
}
