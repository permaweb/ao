"use strict";
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLogger = void 0;
const LoggerSettings_1 = require("../LoggerSettings");
class ConsoleLogger {
    constructor(moduleName, settings) {
        this.moduleName = moduleName;
        this.settings = settings;
    }
    trace(message, ...optionalParams) {
        if (this.shouldLog('trace')) {
            // note: no 'trace' for console logger
            console.debug(this.message('trace', message), optionalParams);
        }
    }
    error(message, ...optionalParams) {
        if (this.shouldLog('error')) {
            console.error(this.message('error', message), optionalParams);
        }
    }
    info(message, ...optionalParams) {
        if (this.shouldLog('info')) {
            console.info(this.message('info', message), optionalParams);
        }
    }
    silly(message, ...optionalParams) {
        if (this.shouldLog('silly')) {
            // note: no silly level for console logger
            console.debug(this.message('silly', message), optionalParams);
        }
    }
    debug(message, ...optionalParams) {
        if (this.shouldLog('debug')) {
            console.debug(this.message('debug', message), optionalParams);
        }
    }
    warn(message, ...optionalParams) {
        if (this.shouldLog('warn')) {
            console.warn(this.message('warn', message), optionalParams);
        }
    }
    log(message, ...optionalParams) {
        if (this.shouldLog('info')) {
            console.info(this.message('info', message), optionalParams);
        }
    }
    fatal(message, ...optionalParams) {
        if (this.shouldLog('fatal')) {
            console.error(this.message('fatal', message), optionalParams);
        }
    }
    shouldLog(logLevel) {
        return (0, LoggerSettings_1.lvlToOrder)(logLevel) >= (0, LoggerSettings_1.lvlToOrder)(this.settings.minLevel);
    }
    setSettings(settings) {
        this.settings = settings;
    }
    message(lvl, message) {
        return `${new Date().toISOString()} ${lvl.toUpperCase()} [${this.moduleName}] ${message}`;
    }
}
exports.ConsoleLogger = ConsoleLogger;
//# sourceMappingURL=ConsoleLogger.js.map