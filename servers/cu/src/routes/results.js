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

// eslint-disable-next-line
const inputSchema = z.object({
  processId: z.string().min(1, 'an ao process id is required'),
  from: z.coerce.string().optional(),
  to: z.coerce.string().optional(),
  sort: z.enum(['ASC', 'DESC']).default('ASC'),
  limit: z.coerce.number()
    /**
     * Since we add one to it in BL to determine whether another page exists,
     * we want to make sure we won't overflow a number
     */
    .max(Number.MAX_SAFE_INTEGER - 10)
    /**
     * Default to 25 evaluation results
     */
    .default(25)
})

export const withResultsRoutes = app => {
  const resultsConnection = toConnection({
    nodeFn: (evaluation) => evaluation.output,
    cursorFn: (evaluation) => evaluation.cursor
  })

  app.get(
    '/results/:processId',
    compose(
      withMiddleware,
      always(async (req, res) => {
        // const {
        //   params: { processId },
        //   query: { from, to, limit, sort },
        //   domain: { apis: { readResults } }
        // } = req

        // const input = inputSchema.parse({ processId, from, to, limit, sort })

        return res.send(resultsConnection({
          nodes: [],
          pageSize: 0
        }))

        // await readResults(input)
        //   .map(({ evaluations }) => res.send(resultsConnection({
        //     nodes: evaluations,
        //     pageSize: input.limit
        //   })))
        //   .toPromise()
      })
    )()
  )

  return app
}
