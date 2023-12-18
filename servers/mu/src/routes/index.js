import { pipe } from 'ramda'

import { withRootRoutes } from './root.js'
import { withSpawnRoutes } from './spawn.js'
import { withMonitorRoutes } from './monitor.js'
import { withTraceRoutes } from './trace.js'

export const withRoutes = pipe(
  withRootRoutes,
  withTraceRoutes,
  withSpawnRoutes,
  withMonitorRoutes
)
