import { always, compose } from 'ramda'
import { z } from 'zod'

import { busyIn } from '../domain/utils.js'
import { withMiddleware, withProcessRestrictionFromPath } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required'),
  to: z.coerce.number().optional()
})

export const withStateRoutes = (app) => {
  // readState
  app.get(
    '/state/:processId',
    compose(
      withMiddleware,
      withProcessRestrictionFromPath,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { to },
          domain: { BUSY_THRESHOLD, apis: { readState } }
        } = req

        const input = inputSchema.parse({ processId, to })

        await busyIn(
          BUSY_THRESHOLD,
          readState(input)
            .map(({ output }) => {
              if (res.raw.writableEnded) return output.Memory
              /**
               * The cu sends the array buffer as binary data,
               * so make sure to set the header to indicate such
               *
               * and then return only the buffer received from BL
               */
              res.header('Content-Type', 'application/octet-stream')
              return output.Memory
            })
            .toPromise(),
          () => {
            res.status(202)
            return { message: `Evaluation of process "${input.processId}" to "${input.to || 'latest'}" is in progress.` }
          }
        ).then((output) => res.send(output))
      })
    )()
  )

  return app
}
