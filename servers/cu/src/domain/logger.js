import pino from 'pino'
import { watchFile } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'

export const logLevels = z.enum(["fatal", "error", "warn", "info", "debug", "trace"])

/**
 * Wrap a pino logger so that it can be used as a callable function.
 * Downstream code can then do:
 *
 *   const logger = _logger.child('some-child')
 *   logger('message %s', arg)
 *
 * This helper binds key methods (like info, child, etc.) to the original logger.
 */
function makeCallableLogger(logger) {
  function callableLogger(...args) {
    return logger.info(...args)
  }
  callableLogger.info = logger.info.bind(logger)
  callableLogger.error = logger.error.bind(logger)
  callableLogger.warn = logger.warn.bind(logger)
  callableLogger.debug = logger.debug.bind(logger)
  if (typeof logger.trace === 'function') {
    callableLogger.trace = logger.trace.bind(logger)
  }
  callableLogger.child = function (...childArgs) {
    const childLogger = logger.child(...childArgs)
    return makeCallableLogger(childLogger)
  }
  return callableLogger
}

/**
 * Create a Pino logger that mimics the behavior of the previous winston logger.
 *
 * Options:
 *   - MODE: runtime mode (e.g. 'development', 'production')
 *   - LOG_CONFIG_PATH: an optional path to a file containing a new log level
 *   - DEFAULT_LOG_LEVEL: the fallback log level (e.g. 'info')
 *   - name: a string used as the logger's root name.
 *
 * The returned logger is callable (delegating to info()) and supports a .child() method.
 */
export const createLogger = ({ MODE, LOG_CONFIG_PATH = '', DEFAULT_LOG_LEVEL, name: rootName }) => {
  let level = DEFAULT_LOG_LEVEL
  if (LOG_CONFIG_PATH) {
    LOG_CONFIG_PATH = resolve(LOG_CONFIG_PATH)
  }

  // Use pino.destination(1) for asynchronous output for better performance.
  const dest = pino.destination(1)
  const root = pino({
    level,
    name: rootName,
    timestamp: pino.stdTimeFunctions.isoTime
  }, dest)

  // Track all loggers so we can update their level dynamically.
  const loggers = [root]
  let prev = null
  async function checkConfig(cur) {
    let newLevel = ''
    if (!cur || !prev || cur.mtimeMs !== prev.mtimeMs) {
      try {
        newLevel = await readFile(LOG_CONFIG_PATH, 'utf-8').then(str => str.trim())
      } catch (err) {
        newLevel = ''
      }
    }
    if (!newLevel) newLevel = DEFAULT_LOG_LEVEL
    if (level !== newLevel) {
      root.error(`Logger Configuration Change: updating log level "${level}" -> "${newLevel}"`)
      level = newLevel
      loggers.forEach(logger => { logger.level = newLevel })
    }
    prev = cur
  }
  if (LOG_CONFIG_PATH) {
    checkConfig()
    watchFile(LOG_CONFIG_PATH, { persistent: false }, checkConfig)
  }

  function log(name) {
    const childLogger = root.child({ name })
    loggers.push(childLogger)
    childLogger.child = (child) => log(`${name}:${child}`)
    return makeCallableLogger(childLogger)
  }

  return log(rootName)
}

/**
 * Create a test logger (for use in test mode)
 */
export const createTestLogger = ({ name, silent = !process.env.DEBUG }) =>
  createLogger({ name, MODE: 'test', DEFAULT_LOG_LEVEL: silent ? 'off' : 'debug' })
