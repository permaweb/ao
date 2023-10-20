import { always, compose } from 'ramda'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required')
  // Anymore inputs? ie. from the body?
})

export const withMonitorRoutes = (app) => {
  app.post(
    '/monitor/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { processId },
          logger,
          domain: { apis }
        } = req

        const input = inputSchema.parse({ processId })

        // call appropriate domain api here
        logger(apis, input)

        return res.status(501).send('Not Implemented')
      })
    )()
  )

  return app
}
