import { of } from 'hyper-async'

export function cacheProcessMemoryWith (env) {
  const logger = env.logger.child('cacheProcessMemory')
  env = { ...env, logger }

  const cacheProcessMemory = env.cacheProcessMemory

  return (ctx) => {
    return of(ctx)
      .chain(cacheProcessMemory)
  }
}
