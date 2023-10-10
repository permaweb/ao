import { pipe } from 'ramda'

import { withContractRoutes } from './contract.js'
import { withResultRoutes } from './result.js'

export const withRoutes = pipe(
  withContractRoutes,
  withResultRoutes
)
