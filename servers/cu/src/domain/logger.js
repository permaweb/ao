import { watchFile } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { tap, trim } from 'ramda'
import { z } from 'zod'
import winston from 'winston'

const { createLogger: createWinstonLogger, transports, format } = winston

function capitalize (str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const logLevels = z.enum(Object.keys(winston.config.npm.levels))

export const createLogger = ({ MODE, LOG_CONFIG_PATH = '', DEFAULT_LOG_LEVEL, name: rootName }) => {
  let level = DEFAULT_LOG_LEVEL
  LOG_CONFIG_PATH = LOG_CONFIG_PATH && resolve(LOG_CONFIG_PATH)

  const root = createWinstonLogger({
    levels: winston.config.npm.levels,
    format: format.combine(
      format.timestamp(),
      format.splat(),
      format.printf(({ level, name = rootName, message, timestamp }) =>
        `${timestamp} ${name} [${level}]: ${message}`)
    ),
    transports: MODE !== 'production'
      ? [new transports.Console()]
        /**
         * TODO: add 'production' transports for separate log levels
         */
      : [new transports.Console()],
    level,
    silent: level === 'off'
  })
  const originalChild = root.child.bind(root)

  /**
   * Track all loggers spawned, so that we may dynamically update
   * their log level
   */
  const loggers = [root]

  let prev = null
  async function checkConfig (cur) {
    let newLevel = ''

    if (!cur || !prev || cur.mtimeMs !== prev.mtimeMs) {
      newLevel = await readFile(LOG_CONFIG_PATH, 'utf-8')
        .then(trim)
        .catch(() => '')
    }

    /**
     * Set level to the default if a new Level is not found
     */
    if (!newLevel) newLevel = DEFAULT_LOG_LEVEL

    if (level !== newLevel) {
      /**
       * Technically not an error, but lowest log level,
       * and so will always be logged
       */
      root.error(`Logger Configuration Change: updating log level "${level}" -> "${newLevel}"`)
      level = newLevel
      /**
       * Change the level of each child logger
       */
      loggers.forEach((l) => { l.level = level })
    }

    prev = cur
  }
  /**
   * Dynamically update the log level based on an optional config file
   */
  if (LOG_CONFIG_PATH) {
    checkConfig()
    watchFile(LOG_CONFIG_PATH, { persistent: false }, checkConfig)
  }

  function log (name) {
    const logger = originalChild({ name })

    loggers.push(logger)
    /**
     * For terseness and backwards compatibility
     */
    logger.child = (child) => log(`${name}:${child}`)

    const logTap = (level) => (note, ...rest) =>
      tap((...args) => logger[level](note, ...rest, ...args))
    /**
     * Default tap is at the 'info' level,
     * for terseness and backwards compatibility
     */
    logger.tap = logTap('info')
    /**
     * tapInfo, tapDebug, ...
     */
    Object.keys(root.levels)
      .forEach((level) => { logger[`tap${capitalize(level)}`] = logTap(level) })

    /**
     * By wrapping the Winston logger in a Proxy, we're able to invoke the
     * logger as a function (defaults to 'info' level) -- a more terse and
     * functional style.
     *
     * This also makes this logger backwards compatible with the previous
     * logger implementation, but now with the addition log levels
     */
    return new Proxy((...args) => { logger.info(...args) }, {
      get: (_, field) => {
        const value = logger[field]
        if (typeof value === 'function') return value.bind(logger)
        return value
      }
    })
  }

  return log(rootName)
}

export const createTestLogger = ({ name, silent = !process.env.DEBUG }) =>
  createLogger({ name, MODE: 'test', DEFAULT_LOG_LEVEL: silent ? 'off' : 'debug' })
