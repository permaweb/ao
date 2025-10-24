import { compose } from 'ramda'

import { withErrorHandler } from './withErrorHandler.js'
import { withDomain } from './withDomain.js'
import { createRateLimitMiddleware } from './withRateLimits.js'
import { config } from '../../config.js'

export * from './withProcessRestriction.js'
export * from './withMetrics.js'
export * from './withCuMode.js'

// Initialize rate limiting with server config
const withRateLimits = createRateLimitMiddleware(config)

/**
 * A convenience method that composes common middleware needed on most routes,
 * such that other routes can simply compose this one middleware.
 */
export const withMiddleware = compose(
  withDomain,
  withErrorHandler,
  withRateLimits
)
