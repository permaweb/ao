import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'

export const withHealthcheckRoutes = (app) => {
  // healthcheck
  app.get(
    '/',
    compose(
      withMiddleware,
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
