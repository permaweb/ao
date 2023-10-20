import { pipe } from 'ramda'

import { withMessageRoutes } from './message.js'
import { withSpawnRoutes } from './spawn.js'
import { withMonitorRoutes } from './monitor.js'

export const withRoutes = pipe(
  withMessageRoutes,
  withSpawnRoutes,
  withMonitorRoutes
)
