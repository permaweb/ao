import { pipe } from 'ramda'

import { withRootRoutes } from './root.js'
import { withMonitorRoutes } from './monitor.js'
import { withMetricRoutes } from './metrics.js'
import { withPushRoutes } from './push.js'

export const withRoutes = pipe(
  withMonitorRoutes,
  withRootRoutes,
  withMetricRoutes,
  withPushRoutes
)
