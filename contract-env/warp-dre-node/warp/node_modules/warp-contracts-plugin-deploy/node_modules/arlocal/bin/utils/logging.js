"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
class Logging {
    constructor(showLogs, persist) {
        this._log = false;
        this._log = showLogs;
        if (!persist) {
            if ((0, fs_1.existsSync)('./logs'))
                (0, fs_1.unlinkSync)('./logs');
        }
    }
    logInFile(args) {
        if (args.length > 3 && args[2] !== '/logs') {
            const log = `[${new Date().toLocaleString()}] ${args.slice(1, 5).join(' ')} \n`;
            (0, fs_1.appendFileSync)('./logs', log);
        }
    }
    log(...args) {
        this.show('log', ...args);
    }
    info(...args) {
        this.show('info', ...args);
    }
    warn(...args) {
        this.show('warn', ...args);
    }
    error(...args) {
        this.show('error', ...args);
    }
    show(type, ...args) {
        if (this._log) {
            console[type](`[${new Date().toLocaleString()}]`, ...args);
        }
    }
}
exports.default = Logging;
//# sourceMappingURL=logging.js.map