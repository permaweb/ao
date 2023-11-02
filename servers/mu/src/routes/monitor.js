import { always, compose } from 'ramda'
import { of } from 'hyper-async'

import { withMiddleware } from './middleware/index.js'

export const withMonitorRoutes = (app) => {
  app.post(
    '/monitor/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          logger,
          domain: { apis: { monitorProcess } }
        } = req

        console.log('hello')

        if (!body) return res.status(400).send('Signed data item is required')

        // call appropriate domain api here
        logger(monitorProcess, body)

        await of({ raw: body })
          .chain(monitorProcess)
          .toPromise()


        return res.status(200).send('Monitoring process')
      })
    )()
  )

  return app
}
