/**
 * TODO: we could inject these, but just keeping simple for now
 */
import { determineHostWith, bailoutWith } from './domain.js'
import { logger } from './logger.js'

import { mountRoutesWithByAoUnit } from './routes/byAoUnit.js'

export function redirectWith ({ aoUnit, hosts, subrouterUrl, surUrl, owners }) {
  const _logger = logger.child('redirect')
  _logger('Configuring to redirect ao %s units...', aoUnit)

  const bailout = aoUnit === 'cu' ? bailoutWith({ fetch, subrouterUrl, surUrl, owners }) : undefined
  const determineHost = determineHostWith({ hosts, bailout })

  /**
   * A middleware that will redirect the request to the host determined
   * by the injected business logic.
   */
  const redirectHandler = ({ processIdFromRequest }) => {
    return async (req, res) => {
      const processId = await processIdFromRequest(req)
      const host = await determineHost({ processId })

      _logger('Redirecting process %s to host %s', processId, host)

      // https://expressjs.com/en/api.html#req.originalUrl
      const location = new URL(req.originalUrl, host)
      res.redirect(307, location)
    }
  }

  const mountRoutesWith = mountRoutesWithByAoUnit[aoUnit]

  return (app) => {
    mountRoutesWith({ app, middleware: redirectHandler })
    return app
  }
}
