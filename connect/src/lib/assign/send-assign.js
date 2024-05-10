import { fromPromise, of } from 'hyper-async'
import { assoc } from 'ramda'

import { deployAssignSchema } from '../../dal.js'

export function sendAssignWith (env) {
  const deployAssign = deployAssignSchema.implement(env.deployAssign)

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(({ process, message, baseLayer, exclude }) =>
        deployAssign({ process, message, baseLayer, exclude })
      ))
      .map(res => assoc('assignmentId', res.assignmentId, ctx))
  }
}
