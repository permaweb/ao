"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerFactory = void 0;
const ConsoleLoggerFactory_1 = require("./web/ConsoleLoggerFactory");
class LoggerFactory {
    constructor() {
        // not instantiable from outside
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setOptions(newOptions, moduleName) {
        LoggerFactory.INST.setOptions(newOptions, moduleName);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getOptions(moduleName) {
        return LoggerFactory.INST.getOptions(moduleName);
    }
    logLevel(level, moduleName) {
        LoggerFactory.INST.logLevel(level, moduleName);
    }
    create(moduleName) {
        return LoggerFactory.INST.create(moduleName);
    }
    static use(logger) {
        LoggerFactory.INST = logger;
    }
}
exports.LoggerFactory = LoggerFactory;
LoggerFactory.INST = new ConsoleLoggerFactory_1.ConsoleLoggerFactory();
//# sourceMappingURL=LoggerFactory.js.map