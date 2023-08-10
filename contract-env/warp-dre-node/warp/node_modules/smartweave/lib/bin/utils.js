"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJsonInput = exports.isExpectedType = exports.assert = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
function assert(expression, message) {
    if (!expression) {
        loglevel_1.default.error(`ERROR: ${message}`);
        process.exit(0);
    }
}
exports.assert = assert;
function isExpectedType(filename, ext) {
    return filename.split('.').pop() === ext;
}
exports.isExpectedType = isExpectedType;
// Support string JSON input & yargs `foo.bar=3` syntax.
function getJsonInput(input) {
    let jsonInput;
    try {
        jsonInput = typeof input === 'string' && JSON.parse(input);
        jsonInput = typeof jsonInput === 'object' && jsonInput ? jsonInput : undefined;
        // tslint:disable-next-line: no-empty
    }
    catch (e) { }
    return jsonInput;
}
exports.getJsonInput = getJsonInput;
