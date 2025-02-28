import { always, compose } from 'ramda'

import { withErrorHandler } from './middleware/withErrorHandler.js'

export const withMetricRoutes = (app) => {
  app.get(
    '/metrics',
    compose(
      withErrorHandler,
      always(async (req, res) => {
        const {
          config,
          domain: { apis: { metrics } }
        } = req

        if (!config.ENABLE_METRICS_ENDPOINT) return res.status(404).send('Not Found')

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
