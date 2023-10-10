import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'

export const withStateRoutes = (app) => {
  // readState
  app.get(
    '/state/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { messageId },
          domain: { apis: { readState } }
        } = req

        return res.send(await readState(processId, messageId))
      })
    )()
  )

  return app
}
