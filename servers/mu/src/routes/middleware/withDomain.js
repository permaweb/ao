import { domainConfigSchema, config } from '../../config.js'
import { logger } from '../../logger.js'
import { createApis } from '../../domain/index.js'

/**
 * A middleware that exposes the domain business logic to a request
 * by attaching each api underneath the 'domain' field on the Request object
 *
 * This allows routes to be encapsulated and easily testable with unit tests
 */

export const domain = {
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger
}

domain.apis = await createApis(domain)

export const withDomain = (handler) => (req, res) => {
  req.logger = logger
  req.domain = domain
  return handler(req, res)
}
