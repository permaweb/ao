/* eslint-disable */

import { LoggerSettings, LogLevel, lvlToOrder } from '../LoggerSettings';
import { WarpLogger } from '../WarpLogger';

export class ConsoleLogger implements WarpLogger {
  constructor(private readonly moduleName, public settings: LoggerSettings) {}

  trace(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('trace')) {
      // note: no 'trace' for console logger
      console.debug(this.message('trace', message), optionalParams);
    }
  }

  error(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.message('error', message), optionalParams);
    }
  }

  info(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.message('info', message), optionalParams);
    }
  }

  silly(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('silly')) {
      // note: no silly level for console logger
      console.debug(this.message('silly', message), optionalParams);
    }
  }

  debug(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.message('debug', message), optionalParams);
    }
  }

  warn(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.message('warn', message), optionalParams);
    }
  }

  log(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.message('info', message), optionalParams);
    }
  }

  fatal(message?: any, ...optionalParams: any[]): void {
    if (this.shouldLog('fatal')) {
      console.error(this.message('fatal', message), optionalParams);
    }
  }

  shouldLog(logLevel: LogLevel): boolean {
    return lvlToOrder(logLevel) >= lvlToOrder(this.settings.minLevel);
  }

  setSettings(settings: LoggerSettings): void {
    this.settings = settings;
  }

  message(lvl: LogLevel, message: string): string {
    return `${new Date().toISOString()} ${lvl.toUpperCase()} [${this.moduleName}] ${message}`;
  }
}
