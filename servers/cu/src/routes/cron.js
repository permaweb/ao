import { always, compose, identity } from 'ramda'

import { withMiddleware } from './middleware/index.js'
import { z } from 'zod'

/**
 * TODO: could be moved into a route utils or middleware
 *
 * keeping local for now, for simplicity
 */
const toConnection = ({ cursorFn, nodeFn = identity }) => ({ nodes, pageSize }) => {
  return {
    pageInfo: {
      hasNextPage: nodes.length > pageSize
    },
    edges: nodes.slice(0, pageSize).map(node => ({
      node: nodeFn(node),
      cursor: cursorFn(node)
    }))
  }
}

const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required'),
  from: z.string().optional(),
  to: z.string().optional()
})

export const withScheduledRoutes = app => {
  const cronConnection = toConnection({
    nodeFn: (evaluation) => evaluation.output,
    cursorFn: (evaluation) => evaluation.timestamp
  })

  app.get(
    '/cron/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { from, to },
          domain: { apis: { readScheduledMessages } }
        } = req

        const input = inputSchema.parse({ processId, from, to })

        await readScheduledMessages(input)
          .map(({ evaluations }) => res.send(cronConnection({
            nodes: evaluations,
            /**
             * For now, always send back a page the size of the total results
             *
             * TODO: allow pagniating between from and to?
             */
            pageSize: evaluations.length
          })))
          .toPromise()
      })
    )()
  )

  return app
}
