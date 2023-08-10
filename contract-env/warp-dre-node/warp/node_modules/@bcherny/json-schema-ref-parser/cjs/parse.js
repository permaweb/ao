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
var _ono = require("@jsdevtools/ono");
var _urlJs = /*#__PURE__*/ _interopRequireWildcard(require("./util/url.js"));
var _pluginsJs = /*#__PURE__*/ _interopRequireWildcard(require("./util/plugins.js"));
var _errorsJs = require("./util/errors.js");
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _asyncToGenerator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
var __generator = (void 0) && (void 0).__generator || function(thisArg, body) {
    var f, y, t, g, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    };
    return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(_)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
};
var _default = parse;
function parse(path, $refs, options) {
    return _parse.apply(this, arguments);
}
function _parse() {
    _parse = /**
 * Reads and parses the specified file path or URL.
 *
 * @param {string} path - This path MUST already be resolved, since `read` doesn't know the resolution context
 * @param {$Refs} $refs
 * @param {$RefParserOptions} options
 *
 * @returns {Promise}
 * The promise resolves with the parsed file contents, NOT the raw (Buffer) contents.
 */ _asyncToGenerator(function(path, $refs, options) {
        var $ref, file, resolver, parser, err;
        return __generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    // Remove the URL fragment, if any
                    path = _urlJs.stripHash(path);
                    $ref = $refs._add(path);
                    file = {
                        url: path,
                        extension: _urlJs.getExtension(path)
                    };
                    _state.label = 1;
                case 1:
                    _state.trys.push([
                        1,
                        4,
                        ,
                        5
                    ]);
                    return [
                        4,
                        readFile(file, options, $refs)
                    ];
                case 2:
                    resolver = _state.sent();
                    $ref.pathType = resolver.plugin.name;
                    file.data = resolver.result;
                    return [
                        4,
                        parseFile(file, options, $refs)
                    ];
                case 3:
                    parser = _state.sent();
                    $ref.value = parser.result;
                    return [
                        2,
                        parser.result
                    ];
                case 4:
                    err = _state.sent();
                    if ((0, _errorsJs.isHandledError)(err)) {
                        $ref.value = err;
                    }
                    throw err;
                case 5:
                    return [
                        2
                    ];
            }
        });
    });
    return _parse.apply(this, arguments);
}
/**
 * Reads the given file, using the configured resolver plugins
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {$RefParserOptions} options
 *
 * @returns {Promise}
 * The promise resolves with the raw file contents and the resolver that was used.
 */ function readFile(file, options, $refs) {
    return new Promise(function(resolve, reject) {
        var onError = function onError(err) {
            if (!err && options.continueOnError) {
                // No resolver could be matched
                reject(new _errorsJs.UnmatchedResolverError(file.url));
            } else if (!err || !("error" in err)) {
                // Throw a generic, friendly error.
                reject(_ono.ono.syntax('Unable to resolve $ref pointer "'.concat(file.url, '"')));
            } else if (_instanceof(err.error, _errorsJs.ResolverError)) {
                reject(err.error);
            } else {
                reject(new _errorsJs.ResolverError(err, file.url));
            }
        };
        // console.log('Reading %s', file.url);
        // Find the resolvers that can read this file
        var resolvers = _pluginsJs.all(options.resolve);
        resolvers = _pluginsJs.filter(resolvers, "canRead", file);
        // Run the resolvers, in order, until one of them succeeds
        _pluginsJs.sort(resolvers);
        _pluginsJs.run(resolvers, "read", file, $refs).then(resolve, onError);
    });
}
/**
 * Parses the given file's contents, using the configured parser plugins.
 *
 * @param {object} file           - An object containing information about the referenced file
 * @param {string} file.url       - The full URL of the referenced file
 * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
 * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
 * @param {$RefParserOptions} options
 *
 * @returns {Promise}
 * The promise resolves with the parsed file contents and the parser that was used.
 */ function parseFile(file, options, $refs) {
    return new Promise(function(resolve, reject) {
        var onParsed = function onParsed(parser) {
            if (!parser.plugin.allowEmpty && isEmpty(parser.result)) {
                reject(_ono.ono.syntax('Error parsing "'.concat(file.url, '" as ').concat(parser.plugin.name, ". \nParsed value is empty")));
            } else {
                resolve(parser);
            }
        };
        var onError = function onError(err) {
            if (!err && options.continueOnError) {
                // No resolver could be matched
                reject(new _errorsJs.UnmatchedParserError(file.url));
            } else if (!err || !("error" in err)) {
                reject(_ono.ono.syntax("Unable to parse ".concat(file.url)));
            } else if (_instanceof(err.error, _errorsJs.ParserError)) {
                reject(err.error);
            } else {
                reject(new _errorsJs.ParserError(err.error.message, file.url));
            }
        };
        // console.log('Parsing %s', file.url);
        // Find the parsers that can read this file type.
        // If none of the parsers are an exact match for this file, then we'll try ALL of them.
        // This handles situations where the file IS a supported type, just with an unknown extension.
        var allParsers = _pluginsJs.all(options.parse);
        var filteredParsers = _pluginsJs.filter(allParsers, "canParse", file);
        var parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;
        // Run the parsers, in order, until one of them succeeds
        _pluginsJs.sort(parsers);
        _pluginsJs.run(parsers, "parse", file, $refs).then(onParsed, onError);
    });
}
/**
 * Determines whether the parsed value is "empty".
 *
 * @param {*} value
 * @returns {boolean}
 */ function isEmpty(value) {
    return value === undefined || typeof value === "object" && Object.keys(value).length === 0 || typeof value === "string" && value.trim().length === 0 || Buffer.isBuffer(value) && value.length === 0;
}
