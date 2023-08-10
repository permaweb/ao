"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLoggerFactory = void 0;
const ConsoleLogger_1 = require("./ConsoleLogger");
class ConsoleLoggerFactory {
    constructor() {
        this.registeredLoggers = {};
        this.registeredOptions = {};
        this.defOptions = {
            minLevel: 'info'
        };
        this.setOptions = this.setOptions.bind(this);
        this.getOptions = this.getOptions.bind(this);
        this.create = this.create.bind(this);
        this.logLevel = this.logLevel.bind(this);
    }
    setOptions(newOptions, moduleName) {
        // FIXME: c/p from TsLogFactory...
        // if moduleName not specified
        if (!moduleName) {
            // update default options
            this.defOptions = newOptions;
            // update options for all already registered loggers
            Object.keys(this.registeredLoggers).forEach((key) => {
                this.registeredLoggers[key].setSettings({
                    ...this.registeredLoggers[key].settings,
                    ...newOptions
                });
            });
        }
        else {
            // if logger already registered
            if (this.registeredLoggers[moduleName]) {
                // update its options
                this.registeredLoggers[moduleName].setSettings({
                    ...this.registeredLoggers[moduleName].settings,
                    ...newOptions
                });
            }
            else {
                // if logger not yet registered - save options that will be used for its creation
                this.registeredOptions[moduleName] = {
                    ...this.defOptions,
                    ...newOptions
                };
            }
        }
    }
    getOptions(moduleName) {
        // FIXME: c/p from TsLogFactory...
        if (!moduleName) {
            return this.defOptions;
        }
        else {
            if (this.registeredLoggers[moduleName]) {
                return this.registeredLoggers[moduleName].settings;
            }
            else if (this.registeredOptions[moduleName]) {
                return this.registeredOptions[moduleName];
            }
            else {
                return this.defOptions;
            }
        }
    }
    logLevel(level, moduleName) {
        // FIXME: c/p from TsLogFactory...
        this.setOptions({ minLevel: level }, moduleName);
    }
    create(moduleName = 'SWC') {
        if (!Object.prototype.hasOwnProperty.call(this.registeredLoggers, moduleName)) {
            this.registeredLoggers[moduleName] = new ConsoleLogger_1.ConsoleLogger(moduleName, this.getOptions(moduleName));
        }
        return this.registeredLoggers[moduleName];
    }
}
exports.ConsoleLoggerFactory = ConsoleLoggerFactory;
//# sourceMappingURL=ConsoleLoggerFactory.js.map