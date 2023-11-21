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
        loader: async (reqs) => {
          return reqs.map(async (req) => {
            const {
              params: { processId },
              query: { to },
              domain: { apis: { readState } }
            } = req

            const input = inputSchema.parse({ processId, to })

            return readState(input)
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
