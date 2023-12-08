import { always, compose } from 'ramda'
import { of } from 'hyper-async'
import { z } from 'zod'

import { withMiddleware } from './middleware/index.js'

/**
 * TODO: could be moved into a route utils or middleware
 *
 * keeping local for now, for simplicity
 */
const toConnection = ({ cursorFn }) => ({ nodes, pageSize }) => {
  return {
    pageInfo: {
      hasNextPage: nodes.length > pageSize
    },
    edges: nodes.slice(0, pageSize).map(node => ({
      node,
      cursor: cursorFn(node)
    }))
  }
}

export const withTraceRoutes = (app) => {
  const DEFAULT_PAGE_SIZE = 10
  const traceConnection = toConnection({ cursorFn: (trace) => trace.id })

  app.get(
    '/',
    compose(
      withMiddleware,
      always(async (req, res) => {
        const {
          query,
          logger: _logger,
          domain: { apis: { traceMsgs } }
        } = req

        /**
         * Not debugging, so just return the base response
         */
        if (!query.debug) return res.send('ao messenger unit')

        const logger = _logger.child('GET_trace')

        const inputSchema = z.object({
          process: z.string().optional(),
          message: z.string().optional(),
          page: z.coerce(z.number().int()).default(1),
          pageSize: z.coerce(z.number().int()).default(DEFAULT_PAGE_SIZE)
        })

        const input = await inputSchema.parseAsync(query)

        if (input.process && input.message) {
          const err = new Error('Only one of process or message query parameters can be provided')
          err.status = 422
          throw err
        }

        /**
         * Retrieve all message traces for the given input
         */
        await of({ ...input, limit: input.pageSize, offset: input.pageSize * (input.page - 1) })
          .chain(traceMsgs)
          .bimap(
            logger.tap('Failed to retrieve trace for process "%s" or message "%s"', input.process, input.message),
            logger.tap('Successfully retrieved trace for process "%s" or message "%s"', input.process, input.message)
          )
          .map(({ traces }) => res.send(traceConnection({ nodes: traces, pageSize: input.pageSize })))
          .toPromise()
      })
    )()
  )

  return app
}
