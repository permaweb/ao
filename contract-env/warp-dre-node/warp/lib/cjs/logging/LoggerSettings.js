"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lvlToOrder = exports.LogLevelOrder = void 0;
exports.LogLevelOrder = {
    silly: 0,
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
    none: 7
};
function lvlToOrder(logLevel) {
    return exports.LogLevelOrder[logLevel];
}
exports.lvlToOrder = lvlToOrder;
//# sourceMappingURL=LoggerSettings.js.map