import { of } from 'hyper-async'
//  import { __, assoc } from 'ramda'
// import z from 'zod'

// const ctxSchema = z.object({

// }).passthrough()

export function resolveSchedulerWith (env) {
  const { logger } = env
  return (ctx) => {
    return of(ctx)
      .map(logger.tap('Resolved Scheduler'))
  }
}
