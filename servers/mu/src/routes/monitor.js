import { always, compose } from 'ramda'
import { of } from 'hyper-async'
// import { z } from 'zod'
// import WarpArBundles from 'warp-arbundles'

import { withMiddleware } from './middleware/index.js'

// const { DataItem } = WarpArBundles

// const inputSchema = z.object({
//   body: z.any().refine(
//     // async (val) => DataItem.verify(val).catch((_err) => false),
//     async (val) => true,
//     { message: 'A valid and signed data item must be provided as the body' }
//   )
// })

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

        if (!body) return res.status(400).send('Signed data item is required')
        // const input = await inputSchema.parseAsync(body)

        await of({ raw: body })
          .chain(monitorProcess)
          .toPromise()

        return res.status(200).send('Monitoring process')
      })
    )()
  )

  app.delete(
    '/monitor/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          body,
          domain: { apis: { stopMonitorProcess } }
        } = req

        if (!body) return res.status(400).send('Signed data item is required')
        // const input = await inputSchema.parseAsync(body)

        await of({ raw: body })
          .chain(stopMonitorProcess)
          .toPromise()

        return res.status(200).send('Process deleted')
      })
    )()
  )

  return app
}
