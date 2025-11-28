import debug from 'debug'
import { tap } from 'ramda'

export const createLogger = (name = '@permaweb/aoconnect') => {
  const logger = debug(name)

  logger.child = (name) => createLogger(`${logger.namespace}:${name}`)
  logger.tap = (note, ...rest) =>
    tap((...args) => logger(note, ...rest, ...args))

  return logger
}

const raw = process.env.DEBUG ?? '';
const enabled = new Set(raw.split(',').map((s) => s.trim()));

export function debugLog(level, ...args) {
  if (!(enabled.has(level) || enabled.has('*'))) return;

  let prefix = `[@permaweb/aoconnect - ${level.toUpperCase()}]`;
  switch (level) {
    case 'info':
      prefix = `\x1b[36m${prefix}\x1b[0m`;
      break;
    case 'warn':
      prefix = `\x1b[33m${prefix}\x1b[0m`;
      break;
    case 'error':
      prefix = `\x1b[31m${prefix}\x1b[0m`;
      break;
  }

  console.log(prefix, ...args);
}

export const verboseLog = (...args) => {
  if (process.env.DEBUG) {
    console.log(...args)
  }
}