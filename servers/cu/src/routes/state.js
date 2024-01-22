import { always, compose } from 'ramda'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required'),
  to: z.coerce.string().optional()
})

export const withStateRoutes = (app) => {
  // readState
  app.get(
    '/state/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { to },
          domain: { apis: { readState } }
        } = req

        const input = inputSchema.parse({ processId, to })

        return readState(input)
          .map((output) => {
            /**
             * The cu sends the array buffer as binary data,
             * so make sure to set the header to indicate such
             *
             * and then return only the buffer received from BL
             */
            res.header('Content-Type', 'application/octet-stream')
            return output.Memory
          })
          .map((memory) => res.send(memory))
          .toPromise()
      })
    )()
  )

  return app
}
