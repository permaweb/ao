import { always, compose } from 'ramda'

import { withErrorHandler } from './middleware/withErrorHandler.js'

export const withHealthcheckRoutes = (app) => {
  // healthcheck
  app.get(
    '/',
    compose(
      withErrorHandler,
      always(async (req, res) => {
        const { domain: { apis: { healthcheck } } } = req

        await healthcheck()
          .map((hc) => res.send(hc))
          .toPromise()
      })
    )()
  )

  return app
}
