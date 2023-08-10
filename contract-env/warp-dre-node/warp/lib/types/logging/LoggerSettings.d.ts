export declare const LogLevelOrder: {
    silly: number;
    trace: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
    fatal: number;
    none: number;
};
/**
 * Log level names (silly - none)
 */
export type LogLevel = 'silly' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';
export interface LoggerSettings {
    minLevel: LogLevel;
}
export declare function lvlToOrder(logLevel: LogLevel): number;
//# sourceMappingURL=LoggerSettings.d.ts.map