import { always, compose } from 'ramda'
import { withMiddleware } from './middleware/index.js'

import { config } from '../config.js'

export const withMetricRoutes = (app) => {
  if (!config.ENABLE_METRICS_ENDPOINT) return app

  app.get(
    '/metrics',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          domain: { apis: { metrics } }
        } = req

        await metrics.compute()
          .toPromise()
          .then((output) => {
            res.type(metrics.contentType)
            res.send(output)
          })
      })
    )()
  )

  return app
}
