import { pipe } from 'ramda'

import { withStateRoutes } from './state.js'
import { withResultRoutes } from './result.js'

export const withRoutes = pipe(
  withStateRoutes,
  withResultRoutes
)
