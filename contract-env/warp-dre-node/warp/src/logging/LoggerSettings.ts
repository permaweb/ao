export const LogLevelOrder = {
  silly: 0,
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6,
  none: 7
};

/**
 * Log level names (silly - none)
 */
export type LogLevel = 'silly' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';

export interface LoggerSettings {
  minLevel: LogLevel;
}

export function lvlToOrder(logLevel: LogLevel) {
  return LogLevelOrder[logLevel];
}
