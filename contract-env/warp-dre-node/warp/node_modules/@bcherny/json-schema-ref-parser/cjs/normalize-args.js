"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _optionsJs = /*#__PURE__*/ _interopRequireDefault(require("./options.js"));
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var _default = normalizeArgs;
/**
 * Normalizes the given arguments, accounting for optional args.
 *
 * @param {Arguments} args
 * @returns {object}
 */ function normalizeArgs(args) {
    var path, schema, options, callback;
    args = Array.prototype.slice.call(args);
    if (typeof args[args.length - 1] === "function") {
        // The last parameter is a callback function
        callback = args.pop();
    }
    if (typeof args[0] === "string") {
        // The first parameter is the path
        path = args[0];
        if (typeof args[2] === "object") {
            // The second parameter is the schema, and the third parameter is the options
            schema = args[1];
            options = args[2];
        } else {
            // The second parameter is the options
            schema = undefined;
            options = args[1];
        }
    } else {
        // The first parameter is the schema
        path = "";
        schema = args[0];
        options = args[1];
    }
    if (!_instanceof(options, _optionsJs.default)) {
        options = new _optionsJs.default(options);
    }
    return {
        path: path,
        schema: schema,
        options: options,
        callback: callback
    };
}
