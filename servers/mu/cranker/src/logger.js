import debug from 'debug'
import { tap } from 'ramda'

export const createLogger = (name) => {
  const logger = debug(name)

  logger.child = (name) => createLogger(`${logger.namespace}:${name}`)
  logger.info = (note, ...rest) =>
    tap((...args) => logger(note, ...rest, ...args))
  logger.info = (note) => 
    tap(() => logger(note))

  return logger
}

export default createLogger
