"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayToHex = void 0;
function arrayToHex(arr) {
    let str = '';
    for (const a of arr) {
        str += ('0' + a.toString(16)).slice(-2);
    }
    return str;
}
exports.arrayToHex = arrayToHex;
//# sourceMappingURL=utils.js.map