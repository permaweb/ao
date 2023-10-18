import { pipe } from 'ramda'

import { withStateRoutes } from './state.js'
import { withResultRoutes } from './result.js'
import { withScheduledRoutes } from './scheduled.js'

export const withRoutes = pipe(
  withStateRoutes,
  withResultRoutes,
  withScheduledRoutes
)
