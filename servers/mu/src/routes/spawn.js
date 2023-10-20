import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'

export const withSpawnRoutes = (app) => {
  app.post(
    '/spawn',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger,
          domain: { apis }
        } = req

        if (!body) return res.status(400).send('Signed data item is required')

        // TODO: call appropriate domain api here
        logger(apis)

        return res.status(501).send('Not Implemented')
      })
    )()
  )

  return app
}
