import { compose } from 'ramda'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'
import { withInMemoryCache } from './middleware/withInMemoryCache.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required'),
  to: z.string().optional()
})

export const withStateRoutes = (app) => {
  // readState
  app.get(
    '/state/:processId',
    compose(
      withMiddleware,
      withInMemoryCache({
        keyer: (req) => {
          const { params: { messageTxId } } = req
          return messageTxId
        },
        loader: async (requests) => {
          return requests.map(async ({ req, res }) => {
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
                return output.buffer
              })
              .toPromise()
              /**
               * Will bubble up to the individual load call
               * on the dataloader, where it can be handled
               * individually
               */
              .catch(err => err)
          })
        }
      })
    )()
  )

  return app
}
