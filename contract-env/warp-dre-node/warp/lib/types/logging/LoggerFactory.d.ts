import { LogLevel } from './LoggerSettings';
import { WarpLogger } from './WarpLogger';
export interface ILoggerFactory {
    setOptions(newOptions: any, moduleName?: string): void;
    getOptions(moduleName?: string): any;
    logLevel(level: LogLevel, moduleName?: string): void;
    create(moduleName?: string): WarpLogger;
}
export declare class LoggerFactory implements ILoggerFactory {
    static INST: ILoggerFactory;
    private constructor();
    setOptions(newOptions: any, moduleName?: string): void;
    getOptions(moduleName?: string): any;
    logLevel(level: LogLevel, moduleName?: string): void;
    create(moduleName?: string): WarpLogger;
    static use(logger: ILoggerFactory): void;
}
//# sourceMappingURL=LoggerFactory.d.ts.map