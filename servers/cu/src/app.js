/**
 * The dirty component that knows all the details about which
 * effects, and which configuration should be passed where.
 */

import { setGlobalDispatcher, Agent, fetch } from 'undici'

import { config } from './config.js'
import { logger } from './logger.js'

import { bootstrap } from './domain/index.js'

import { createEffects as createCuEffects } from './effects/main.cu.js'

setGlobalDispatcher(new Agent({
  /** the timeout, in milliseconds, after which a socket without active requests will time out. Monitors time between activity on a connected socket. This value may be overridden by *keep-alive* hints from the server */
  keepAliveTimeout: 30 * 1000, // 30 seconds
  /** the maximum allowed `idleTimeout`, in milliseconds, when overridden by *keep-alive* hints from the server. */
  keepAliveMaxTimeout: 10 * 60 * 1000 // 10 mins
}))

/**
 * @param {{ config: typeof config, logger: typeof logger}} context
 * @returns the effects needed in order to run in a particular mode
 */
function chooseEffects (ctx) {
  if (['cu', 'ru'].includes(ctx.UNIT_MODE)) {
    return createCuEffects({ ...config, logger, fetch })
  }

  throw new Error(`Unknown effects for UNIT_MODE: ${ctx.UNIT_MODE}`)
}

export const cu = async ({ config, logger }) => {
  const effects = {
    ...(await chooseEffects({ ...config, logger, fetch })),
    logger
  }

  const application = await bootstrap({ config, effects })

  process.on('uncaughtException', (err) => {
    console.trace('Uncaught Exception:', err)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.trace('Unhandled Rejection at:', promise, 'reason:', reason)
  })

  return application.start()
}

export const app = cu({ config, logger })
