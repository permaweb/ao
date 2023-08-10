/* eslint-disable no-unused-vars */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    default: function() {
        return _default;
    },
    JSONParserError: function() {
        return _errorsJs.JSONParserError;
    },
    InvalidPointerError: function() {
        return _errorsJs.InvalidPointerError;
    },
    MissingPointerError: function() {
        return _errorsJs.MissingPointerError;
    },
    ResolverError: function() {
        return _errorsJs.ResolverError;
    },
    ParserError: function() {
        return _errorsJs.ParserError;
    },
    UnmatchedParserError: function() {
        return _errorsJs.UnmatchedParserError;
    },
    UnmatchedResolverError: function() {
        return _errorsJs.UnmatchedResolverError;
    },
    parse: function() {
        return parse;
    },
    resolve: function() {
        return resolve;
    },
    bundle: function() {
        return bundle;
    },
    dereference: function() {
        return dereference;
    }
});
var _refsJs = /*#__PURE__*/ _interopRequireDefault(require("./refs.js"));
var _parseJs = /*#__PURE__*/ _interopRequireDefault(require("./parse.js"));
var _normalizeArgsJs = /*#__PURE__*/ _interopRequireDefault(require("./normalize-args.js"));
var _resolveExternalJs = /*#__PURE__*/ _interopRequireDefault(require("./resolve-external.js"));
var _bundleJs = /*#__PURE__*/ _interopRequireDefault(require("./bundle.js"));
var _dereferenceJs = /*#__PURE__*/ _interopRequireDefault(require("./dereference.js"));
var _urlJs = /*#__PURE__*/ _interopRequireWildcard(require("./util/url.js"));
var _errorsJs = require("./util/errors.js");
var _callMeMaybe = /*#__PURE__*/ _interopRequireDefault(require("call-me-maybe"));
var _ono = require("@jsdevtools/ono");
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
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
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
    return(g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g);
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
var _default = $RefParser;
/**
 * This class parses a JSON schema, builds a map of its JSON references and their resolved values,
 * and provides methods for traversing, manipulating, and dereferencing those references.
 *
 * @constructor
 */ function $RefParser() {
    /**
   * The parsed (and possibly dereferenced) JSON schema object
   *
   * @type {object}
   * @readonly
   */ this.schema = null;
    /**
   * The resolved JSON references
   *
   * @type {$Refs}
   * @readonly
   */ this.$refs = new _refsJs.default();
}
/**
 * Parses the given JSON schema.
 * This method does not resolve any JSON references.
 * It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed
 * @param {function} [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
 * @returns {Promise} - The returned promise resolves with the parsed JSON schema object.
 */ $RefParser.parse = function parse(path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.parse.apply(instance, arguments);
};
/**
 * Parses the given JSON schema.
 * This method does not resolve any JSON references.
 * It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed
 * @param {function} [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
 * @returns {Promise} - The returned promise resolves with the parsed JSON schema object.
 */ $RefParser.prototype.parse = function() {
    var _parse = _asyncToGenerator(function(path, schema, options, callback) {
        var args, promise, _$err, pathType, $ref, me, result, err;
        var _arguments = arguments;
        return __generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    args = (0, _normalizeArgsJs.default)(_arguments);
                    if (!args.path && !args.schema) {
                        _$err = (0, _ono.ono)("Expected a file path, URL, or object. Got ".concat(args.path || args.schema));
                        return [
                            2,
                            (0, _callMeMaybe.default)(args.callback, Promise.reject(_$err))
                        ];
                    }
                    // Reset everything
                    this.schema = null;
                    this.$refs = new _refsJs.default();
                    pathType = "http";
                    if (_urlJs.isFileSystemPath(args.path)) {
                        args.path = _urlJs.fromFileSystemPath(args.path);
                        pathType = "file";
                    }
                    // Resolve the absolute path of the schema
                    args.path = _urlJs.resolve(_urlJs.cwd(), args.path);
                    if (args.schema && typeof args.schema === "object") {
                        $ref = this.$refs._add(args.path);
                        $ref.value = args.schema;
                        $ref.pathType = pathType;
                        promise = Promise.resolve(args.schema);
                    } else {
                        // Parse the schema file/url
                        promise = (0, _parseJs.default)(args.path, this.$refs, args.options);
                    }
                    me = this;
                    _state.label = 1;
                case 1:
                    _state.trys.push([
                        1,
                        3,
                        ,
                        4
                    ]);
                    return [
                        4,
                        promise
                    ];
                case 2:
                    result = _state.sent();
                    if (result !== null && typeof result === "object" && !Buffer.isBuffer(result)) {
                        me.schema = result;
                        return [
                            2,
                            (0, _callMeMaybe.default)(args.callback, Promise.resolve(me.schema))
                        ];
                    } else if (args.options.continueOnError) {
                        me.schema = null; // it's already set to null at line 79, but let's set it again for the sake of readability
                        return [
                            2,
                            (0, _callMeMaybe.default)(args.callback, Promise.resolve(me.schema))
                        ];
                    } else {
                        throw _ono.ono.syntax('"'.concat(me.$refs._root$Ref.path || result, '" is not a valid JSON Schema'));
                    }
                    return [
                        3,
                        4
                    ];
                case 3:
                    err = _state.sent();
                    if (!args.options.continueOnError || !(0, _errorsJs.isHandledError)(err)) {
                        return [
                            2,
                            (0, _callMeMaybe.default)(args.callback, Promise.reject(err))
                        ];
                    }
                    if (this.$refs._$refs[_urlJs.stripHash(args.path)]) {
                        this.$refs._$refs[_urlJs.stripHash(args.path)].addError(err);
                    }
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.resolve(null))
                    ];
                case 4:
                    return [
                        2
                    ];
            }
        });
    });
    function parse(path, schema, options, callback) {
        return _parse.apply(this, arguments);
    }
    return parse;
}();
/**
 * Parses the given JSON schema and resolves any JSON references, including references in
 * externally-referenced files.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed and resolved
 * @param {function} [callback]
 * - An error-first callback. The second parameter is a {@link $Refs} object containing the resolved JSON references
 *
 * @returns {Promise}
 * The returned promise resolves with a {@link $Refs} object containing the resolved JSON references
 */ $RefParser.resolve = function resolve(path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.resolve.apply(instance, arguments);
};
/**
 * Parses the given JSON schema and resolves any JSON references, including references in
 * externally-referenced files.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed and resolved
 * @param {function} [callback]
 * - An error-first callback. The second parameter is a {@link $Refs} object containing the resolved JSON references
 *
 * @returns {Promise}
 * The returned promise resolves with a {@link $Refs} object containing the resolved JSON references
 */ $RefParser.prototype.resolve = function() {
    var _resolve = _asyncToGenerator(function(path, schema, options, callback) {
        var me, args, err;
        var _arguments = arguments;
        return __generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    me = this;
                    args = (0, _normalizeArgsJs.default)(_arguments);
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
                        this.parse(args.path, args.schema, args.options)
                    ];
                case 2:
                    _state.sent();
                    return [
                        4,
                        (0, _resolveExternalJs.default)(me, args.options)
                    ];
                case 3:
                    _state.sent();
                    finalize(me);
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.resolve(me.$refs))
                    ];
                case 4:
                    err = _state.sent();
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.reject(err))
                    ];
                case 5:
                    return [
                        2
                    ];
            }
        });
    });
    function resolve(path, schema, options, callback) {
        return _resolve.apply(this, arguments);
    }
    return resolve;
}();
/**
 * Parses the given JSON schema, resolves any JSON references, and bundles all external references
 * into the main JSON schema. This produces a JSON schema that only has *internal* references,
 * not any *external* references.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
 * @param {function} [callback] - An error-first callback. The second parameter is the bundled JSON schema object
 * @returns {Promise} - The returned promise resolves with the bundled JSON schema object.
 */ $RefParser.bundle = function bundle(path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.bundle.apply(instance, arguments);
};
/**
 * Parses the given JSON schema, resolves any JSON references, and bundles all external references
 * into the main JSON schema. This produces a JSON schema that only has *internal* references,
 * not any *external* references.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
 * @param {function} [callback] - An error-first callback. The second parameter is the bundled JSON schema object
 * @returns {Promise} - The returned promise resolves with the bundled JSON schema object.
 */ $RefParser.prototype.bundle = function() {
    var _bundle = _asyncToGenerator(function(path, schema, options, callback) {
        var me, args, err;
        var _arguments = arguments;
        return __generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    me = this;
                    args = (0, _normalizeArgsJs.default)(_arguments);
                    _state.label = 1;
                case 1:
                    _state.trys.push([
                        1,
                        3,
                        ,
                        4
                    ]);
                    return [
                        4,
                        this.resolve(args.path, args.schema, args.options)
                    ];
                case 2:
                    _state.sent();
                    (0, _bundleJs.default)(me, args.options);
                    finalize(me);
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.resolve(me.schema))
                    ];
                case 3:
                    err = _state.sent();
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.reject(err))
                    ];
                case 4:
                    return [
                        2
                    ];
            }
        });
    });
    function bundle(path, schema, options, callback) {
        return _bundle.apply(this, arguments);
    }
    return bundle;
}();
/**
 * Parses the given JSON schema, resolves any JSON references, and dereferences the JSON schema.
 * That is, all JSON references are replaced with their resolved values.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
 * @param {function} [callback] - An error-first callback. The second parameter is the dereferenced JSON schema object
 * @returns {Promise} - The returned promise resolves with the dereferenced JSON schema object.
 */ $RefParser.dereference = function dereference(path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.dereference.apply(instance, arguments);
};
/**
 * Parses the given JSON schema, resolves any JSON references, and dereferences the JSON schema.
 * That is, all JSON references are replaced with their resolved values.
 *
 * @param {string} [path] - The file path or URL of the JSON schema
 * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
 * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
 * @param {function} [callback] - An error-first callback. The second parameter is the dereferenced JSON schema object
 * @returns {Promise} - The returned promise resolves with the dereferenced JSON schema object.
 */ $RefParser.prototype.dereference = function() {
    var _dereference = _asyncToGenerator(function(path, schema, options, callback) {
        var me, args, err;
        var _arguments = arguments;
        return __generator(this, function(_state) {
            switch(_state.label){
                case 0:
                    me = this;
                    args = (0, _normalizeArgsJs.default)(_arguments);
                    _state.label = 1;
                case 1:
                    _state.trys.push([
                        1,
                        3,
                        ,
                        4
                    ]);
                    return [
                        4,
                        this.resolve(args.path, args.schema, args.options)
                    ];
                case 2:
                    _state.sent();
                    (0, _dereferenceJs.default)(me, args.options);
                    finalize(me);
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.resolve(me.schema))
                    ];
                case 3:
                    err = _state.sent();
                    return [
                        2,
                        (0, _callMeMaybe.default)(args.callback, Promise.reject(err))
                    ];
                case 4:
                    return [
                        2
                    ];
            }
        });
    });
    function dereference(path, schema, options, callback) {
        return _dereference.apply(this, arguments);
    }
    return dereference;
}();
function finalize(parser) {
    var errors = _errorsJs.JSONParserErrorGroup.getParserErrors(parser);
    if (errors.length > 0) {
        throw new _errorsJs.JSONParserErrorGroup(parser);
    }
}
var parse = $RefParser.parse.bind($RefParser);
var resolve = $RefParser.resolve.bind($RefParser);
var bundle = $RefParser.bundle.bind($RefParser);
var dereference = $RefParser.dereference.bind($RefParser);
// CommonJS default export hack
if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = Object.assign(module.exports.default, module.exports);
}
