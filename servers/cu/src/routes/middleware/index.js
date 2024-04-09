import { compose } from 'ramda'

import { withErrorHandler } from './withErrorHandler.js'
import { withDomain } from './withDomain.js'

export * from './withProcessRestriction.js'

/**
 * A convenience method that composes common middleware needed on most routes,
 * such that other routes can simply compose this one middleware.
 */
export const withMiddleware = compose(
  withDomain,
  withErrorHandler
)
