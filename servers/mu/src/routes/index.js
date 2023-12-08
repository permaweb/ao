import { pipe } from 'ramda'

import { withMessageRoutes } from './message.js'
import { withSpawnRoutes } from './spawn.js'
import { withMonitorRoutes } from './monitor.js'
import { withTraceRoutes } from './trace.js'

export const withRoutes = pipe(
  withTraceRoutes,
  withMessageRoutes,
  withSpawnRoutes,
  withMonitorRoutes
)
