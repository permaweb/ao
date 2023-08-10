"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = SmartWeaveError;
