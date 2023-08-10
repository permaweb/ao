/* eslint lines-around-comment: [2, {beforeBlockComment: false}] */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _jsonJs = /*#__PURE__*/ _interopRequireDefault(require("./parsers/json.js"));
var _yamlJs = /*#__PURE__*/ _interopRequireDefault(require("./parsers/yaml.js"));
var _textJs = /*#__PURE__*/ _interopRequireDefault(require("./parsers/text.js"));
var _binaryJs = /*#__PURE__*/ _interopRequireDefault(require("./parsers/binary.js"));
var _fileJs = /*#__PURE__*/ _interopRequireDefault(require("./resolvers/file.js"));
var _httpJs = /*#__PURE__*/ _interopRequireDefault(require("./resolvers/http.js"));
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
var _default = $RefParserOptions;
/**
 * Options that determine how JSON schemas are parsed, resolved, and dereferenced.
 *
 * @param {object|$RefParserOptions} [options] - Overridden options
 * @constructor
 */ function $RefParserOptions(options) {
    merge(this, $RefParserOptions.defaults);
    merge(this, options);
}
$RefParserOptions.defaults = {
    /**
   * Determines how different types of files will be parsed.
   *
   * You can add additional parsers of your own, replace an existing one with
   * your own implementation, or disable any parser by setting it to false.
   */ parse: {
        json: _jsonJs.default,
        yaml: _yamlJs.default,
        text: _textJs.default,
        binary: _binaryJs.default
    },
    /**
   * Determines how JSON References will be resolved.
   *
   * You can add additional resolvers of your own, replace an existing one with
   * your own implementation, or disable any resolver by setting it to false.
   */ resolve: {
        file: _fileJs.default,
        http: _httpJs.default,
        /**
     * Determines whether external $ref pointers will be resolved.
     * If this option is disabled, then none of above resolvers will be called.
     * Instead, external $ref pointers will simply be ignored.
     *
     * @type {boolean}
     */ external: true
    },
    /**
   * By default, JSON Schema $Ref Parser throws the first error it encounters. Setting `continueOnError` to `true`
   * causes it to keep processing as much as possible and then throw a single error that contains all errors
   * that were encountered.
  */ continueOnError: false,
    /**
   * Determines the types of JSON references that are allowed.
   */ dereference: {
        /**
     * Dereference circular (recursive) JSON references?
     * If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
     * If "ignore", then circular references will not be dereferenced.
     *
     * @type {boolean|string}
     */ circular: true,
        /**
     * A function, called for each path, which can return true to stop this path and all
     * subpaths from being dereferenced further. This is useful in schemas where some
     * subpaths contain literal $ref keys that should not be dereferenced.
     *
     * @type {function}
     */ excludedPathMatcher: function() {
            return false;
        }
    }
};
/**
 * Merges the properties of the source object into the target object.
 *
 * @param {object} target - The object that we're populating
 * @param {?object} source - The options that are being merged
 * @returns {object}
 */ function merge(target, source) {
    if (isMergeable(source)) {
        var keys = Object.keys(source);
        for(var i = 0; i < keys.length; i++){
            var key = keys[i];
            var sourceSetting = source[key];
            var targetSetting = target[key];
            if (isMergeable(sourceSetting)) {
                // It's a nested object, so merge it recursively
                target[key] = merge(targetSetting || {}, sourceSetting);
            } else if (sourceSetting !== undefined) {
                // It's a scalar value, function, or array. No merging necessary. Just overwrite the target value.
                target[key] = sourceSetting;
            }
        }
    }
    return target;
}
/**
 * Determines whether the given value can be merged,
 * or if it is a scalar value that should just override the target value.
 *
 * @param   {*}  val
 * @returns {Boolean}
 */ function isMergeable(val) {
    return val && typeof val === "object" && !Array.isArray(val) && !_instanceof(val, RegExp) && !_instanceof(val, Date);
}
