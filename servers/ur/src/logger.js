import debug from 'debug'
import { tap } from 'ramda'

const createLogger = (name) => {
  const logger = debug(name)

  logger.child = (name) => createLogger(`${logger.namespace}:${name}`)
  logger.tap = (note, ...rest) =>
    tap((...args) => logger(note, ...rest, ...args))

  return logger
}

export const logger = createLogger('ao-router')
