"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToBigNum = exports.arToWinston = exports.winstonToAr = void 0;
const bignumber_js_1 = require("bignumber.js");
function winstonToAr(winstonString, { formatted = false, decimals = 12 } = {}) {
    const num = stringToBigNum(winstonString).shiftedBy(-12);
    return formatted ? num.toFormat(decimals) : num.toFixed(decimals);
}
exports.winstonToAr = winstonToAr;
function arToWinston(arString, { formatted = false } = {}) {
    const num = stringToBigNum(arString).shiftedBy(12);
    return formatted ? num.toFormat() : num.toFixed(0);
}
exports.arToWinston = arToWinston;
function stringToBigNum(stringValue) {
    return new bignumber_js_1.BigNumber(stringValue); // second argument is base, defaulted to base 10
}
exports.stringToBigNum = stringToBigNum;
//# sourceMappingURL=ar.js.map