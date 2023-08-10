"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartWeaveError = exports.SmartWeaveErrorType = void 0;
var SmartWeaveErrorType;
(function (SmartWeaveErrorType) {
    SmartWeaveErrorType["CONTRACT_NOT_FOUND"] = "CONTRACT_NOT_FOUND";
})(SmartWeaveErrorType = exports.SmartWeaveErrorType || (exports.SmartWeaveErrorType = {}));
class SmartWeaveError extends Error {
    constructor(type, optional = {}) {
        if (optional.message) {
            super(optional.message);
        }
        else {
            super();
        }
        this.type = type;
        this.otherInfo = optional;
    }
    getType() {
        return this.type;
    }
}
exports.SmartWeaveError = SmartWeaveError;
//# sourceMappingURL=errors.js.map