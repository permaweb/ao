import { pipe } from 'ramda'

import { withStateRoutes } from './state.js'
import { withResultRoutes } from './result.js'
import { withResultsRoutes } from './results.js'
import { withCronRoutes } from './cron.js'
import { withHealthcheckRoutes } from './healthcheck.js'

export const withRoutes = pipe(
  withHealthcheckRoutes,
  withStateRoutes,
  withResultRoutes,
  withResultsRoutes,
  withCronRoutes
)
