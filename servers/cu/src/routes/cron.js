import { always, compose, identity } from 'ramda'
import { z } from 'zod'

import { withMiddleware, withProcessRestrictionFromPath } from './middleware/index.js'

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
  /**
   * Default to just a large number, which will effectively
   * fetch all evaluations in the range within a single page
   */
  limit: z.coerce.number().default(Number.MAX_SAFE_INTEGER - 10)
})

export const withCronRoutes = app => {
  const cronConnection = toConnection({
    nodeFn: (evaluation) => evaluation.output,
    cursorFn: (evaluation) => evaluation.cursor
  })

  app.get(
    '/cron/:processId',
    compose(
      withMiddleware,
      withProcessRestrictionFromPath,
      always(async (req, res) => {
        const {
          params: { processId },
          query: { from, to, limit },
          domain: { apis: { readCronResults } }
        } = req

        const input = inputSchema.parse({ processId, from, to, limit })

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
