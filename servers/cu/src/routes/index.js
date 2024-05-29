import { pipe } from 'ramda'

import { withStateRoutes } from './state.js'
import { withResultRoutes } from './result.js'
import { withDryRunRoutes } from './dryRun.js'
import { withResultsRoutes } from './results.js'
import { withCronRoutes } from './cron.js'
import { withHealthcheckRoutes } from './healthcheck.js'
import { withMetricRoutes } from './metrics.js'

export const withRoutes = pipe(
  withHealthcheckRoutes,
  withStateRoutes,
  withResultRoutes,
  withDryRunRoutes,
  withResultsRoutes,
  withCronRoutes,
  withMetricRoutes
)
