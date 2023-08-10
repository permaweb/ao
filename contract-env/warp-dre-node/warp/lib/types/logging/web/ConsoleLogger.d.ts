import { LoggerSettings, LogLevel } from '../LoggerSettings';
import { WarpLogger } from '../WarpLogger';
export declare class ConsoleLogger implements WarpLogger {
    private readonly moduleName;
    settings: LoggerSettings;
    constructor(moduleName: any, settings: LoggerSettings);
    trace(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
    info(message?: any, ...optionalParams: any[]): void;
    silly(message?: any, ...optionalParams: any[]): void;
    debug(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
    fatal(message?: any, ...optionalParams: any[]): void;
    shouldLog(logLevel: LogLevel): boolean;
    setSettings(settings: LoggerSettings): void;
    message(lvl: LogLevel, message: string): string;
}
//# sourceMappingURL=ConsoleLogger.d.ts.map