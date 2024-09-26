import { hostname } from 'node:os'

import { createLogger } from './domain/logger.js'
import { config } from './config.js'

export const logger = createLogger({
  MODE: config.MODE,
  LOG_CONFIG_PATH: config.LOG_CONFIG_PATH,
  DEFAULT_LOG_LEVEL: config.DEFAULT_LOG_LEVEL,
  name: `ao-cu:${hostname()}`
})
