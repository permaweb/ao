import { pipe } from 'ramda'

import { withStateRoutes } from './state.js'
import { withResultRoutes } from './result.js'
import { withCronRoutes } from './cron.js'

export const withRoutes = pipe(
  withStateRoutes,
  withResultRoutes,
  withCronRoutes
)
