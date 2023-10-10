import { always, compose } from 'ramda'

import { withMiddleware } from './middleware/index.js'

export const withContractRoutes = (app) => {
  // readState
  app.get(
    '/contract/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { to: messageId },
          domain: { apis: { readState } }
        } = req

        return res.send(await readState(processId, messageId))
      })
    )()
  )

  return app
}
