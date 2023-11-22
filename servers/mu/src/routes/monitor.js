import { always, compose } from 'ramda'
import { of } from 'hyper-async'
import { z } from 'zod'
import WarpArBundles from 'warp-arbundles'

import { withMiddleware } from './middleware/index.js'

const { DataItem } = WarpArBundles

const inputSchema = z.object({
  body: z.any().refine(
    async (val) => DataItem.verify(val).catch((_err) => false),
    { message: 'A valid and signed data item must be provided as the body' }
  )
})

export const withMonitorRoutes = (app) => {
  app.post(
    '/monitor/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          domain: { apis: { monitorProcess } }
        } = req

        const input = await inputSchema.parseAsync(body)

        await of({ raw: input.body })
          .chain(monitorProcess)
          .toPromise()

        return res.status(200).send('Monitoring process')
      })
    )()
  )

  return app
}
