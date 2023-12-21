import { pipe } from 'ramda'

import { withRootRoutes } from './root.js'
import { withMonitorRoutes } from './monitor.js'

export const withRoutes = pipe(
  withMonitorRoutes,
  withRootRoutes
)
