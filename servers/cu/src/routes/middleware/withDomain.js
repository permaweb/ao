import { fetch, setGlobalDispatcher, Agent } from 'undici'

import { config } from '../../config.js'
import { logger } from '../../logger.js'
import { createApis, domainConfigSchema } from '../../domain/index.js'

setGlobalDispatcher(new Agent({
  /** the timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by *keep-alive* hints from the server */
  keepAliveTimeout: 30 * 1000, // 30 seconds
  /** the maximum allowed `idleTimeout`, in milliseconds, when overridden by *keep-alive* hints from the server. */
  keepAliveMaxTimeout: 10 * 60 * 1000 // 10 mins
}))

/**
 * TODO: probably a better place to expose this,
 * but this works for now
 */
export const domain = {
  /**
   * Ensure server lvl config is never exposed to domain,
   * by simply parsing it out
   */
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger
}
domain.apis = await createApis(domain)

/**
 * A middleware that exposes the domain business logic to a request
 * by attaching each api underneath the 'domain' field on the Request object
 *
 * This allows routes to be encapsulated and easily testable with unit tests
 */
export const withDomain = (handler) => (req, res) => {
  req.domain = domain
  return handler(req, res)
}
