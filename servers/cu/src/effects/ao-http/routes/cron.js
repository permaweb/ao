import { always, compose, identity } from 'ramda'
import { z } from 'zod'

import { withErrorHandler } from './middleware/withErrorHandler.js'
import { withCuMode } from './middleware/withCuMode.js'
import { withMetrics } from './middleware/withMetrics.js'
import { withProcessRestrictionFromPath } from './middleware/withProcessRestriction.js'

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
  from: z.coerce.string().optional(),
  to: z.coerce.string().optional(),
  limit: z.coerce.number().default(500)
})

export const withCronRoutes = app => {
  const cronConnection = toConnection({
    nodeFn: (evaluation) => evaluation.output,
    cursorFn: (evaluation) => evaluation.cursor
  })

  app.get(
    '/cron/:processId',
    compose(
      withErrorHandler,
      withCuMode,
      withProcessRestrictionFromPath,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.params.processId }) }),
      always(async (req, res) => {
        const {
          params: { processId },
          query: { from, to, limit },
          domain: { apis: { readCronResults } }
        } = req

        const input = inputSchema.parse({ processId, from, to, limit })

        /**
         * The absolute max page size is 1000
         *
         * The CRON may perform much more work than 1000,
         * but then will only gather the results up to the page
         * size, allowing the monitor to paginate over the previously
         * computed results, while then incrementally moving forward.
         *
         * This helps prevent a long-unmonitored cron from attempting
         * to respond with massive pages, which can cause performance
         * issues for server, as well as client (typically a MU)
         */
        input.limit = Math.min(input.limit, 1000)

        await readCronResults(input)
          .map(({ evaluations }) => res.send(cronConnection({
            nodes: evaluations,
            pageSize: input.limit
          })))
          .toPromise()
      })
    )()
  )

  return app
}
