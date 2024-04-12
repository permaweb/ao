import { fromPromise, of } from 'hyper-async'
import { __, assoc } from 'ramda'

import { deployAssignSchema } from '../../dal.js'


export function sendAssignWith (env) {
  const deployAssign = deployAssignSchema.implement(env.deployAssign)

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(({ process, message }) =>
        deployAssign({ process, message })
      ))
      .map(res => assoc('assignmentId', res.assignmentId, ctx))
  }
}
