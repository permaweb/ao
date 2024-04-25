import { domainConfigSchema, config } from '../../config.js'
import { logger } from '../../logger.js'
import { createApis } from '../../domain/index.js'

/**
 * A middleware that exposes the domain business logic to a request
 * by attaching each api underneath the 'domain' field on the Request object
 *
 * This allows routes to be encapsulated and easily testable with unit tests
 */
export const withDomain = (handler) => (req, res) => {
  req.logger = logger
  req.domain = {
    /**
     * Ensure server lvl config is never exposed to domain,
     * by simply parsing it out
     */
    ...(domainConfigSchema.parse(config)),
    fetch,
    logger
  }
  req.domain.apis = createApis(req.domain)

  return handler(req, res)
}
