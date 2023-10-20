import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'

export const withMessageRoutes = (app) => {
  app.post(
    '/message',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger,
          domain: { apis }
        } = req

        if (!body) return res.status(400).send('Signed data item is required')

        // call the appropriate domain api
        logger(apis)

        return res.status(501).send('Not Implemented')
      })
    )()
  )

  return app
}
