"use strict";
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
    JSONParserError: function() {
        return JSONParserError;
    },
    JSONParserErrorGroup: function() {
        return JSONParserErrorGroup;
    },
    ParserError: function() {
        return ParserError;
    },
    UnmatchedParserError: function() {
        return UnmatchedParserError;
    },
    ResolverError: function() {
        return ResolverError;
    },
    UnmatchedResolverError: function() {
        return UnmatchedResolverError;
    },
    MissingPointerError: function() {
        return MissingPointerError;
    },
    InvalidPointerError: function() {
        return InvalidPointerError;
    },
    isHandledError: function() {
        return isHandledError;
    },
    normalizeError: function() {
        return normalizeError;
    }
});
var _ono = require("@jsdevtools/ono");
var _urlJs = require("./url.js");
function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;
    for(var i = 0, arr2 = new Array(len); i < len; i++)arr2[i] = arr[i];
    return arr2;
}
function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _assertThisInitialized(self) {
    if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
}
function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
        Date.prototype.toString.call(Reflect.construct(Date, [], function() {}));
        return true;
    } catch (e) {
        return false;
    }
}
function _construct(Parent, args, Class) {
    if (isNativeReflectConstruct()) {
        _construct = Reflect.construct;
    } else {
        _construct = function _construct(Parent, args, Class) {
            var a = [
                null
            ];
            a.push.apply(a, args);
            var Constructor = Function.bind.apply(Parent, a);
            var instance = new Constructor();
            if (Class) _setPrototypeOf(instance, Class.prototype);
            return instance;
        };
    }
    return _construct.apply(null, arguments);
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
}
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
}
function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
}
function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _possibleConstructorReturn(self, call) {
    if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
    }
    return _assertThisInitialized(self);
}
function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
    };
    return _setPrototypeOf(o, p);
}
function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
var _typeof = function(obj) {
    "@swc/helpers - typeof";
    return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj;
};
function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(n);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;
    _wrapNativeSuper = function _wrapNativeSuper(Class) {
        if (Class === null || !_isNativeFunction(Class)) return Class;
        if (typeof Class !== "function") {
            throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
            if (_cache.has(Class)) return _cache.get(Class);
            _cache.set(Class, Wrapper);
        }
        function Wrapper() {
            return _construct(Class, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class.prototype, {
            constructor: {
                value: Wrapper,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        return _setPrototypeOf(Wrapper, Class);
    };
    return _wrapNativeSuper(Class);
}
function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
        return true;
    } catch (e) {
        return false;
    }
}
function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
            var NewTarget = _getPrototypeOf(this).constructor;
            result = Reflect.construct(Super, arguments, NewTarget);
        } else {
            result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
    };
}
var JSONParserError = /*#__PURE__*/ function(Error1) {
    "use strict";
    _inherits(JSONParserError, Error1);
    var _super = _createSuper(JSONParserError);
    function JSONParserError(message, source) {
        _classCallCheck(this, JSONParserError);
        var _this;
        _this = _super.call(this);
        _this.code = "EUNKNOWN";
        _this.message = message;
        _this.source = source;
        _this.path = null;
        _ono.Ono.extend(_assertThisInitialized(_this));
        return _this;
    }
    _createClass(JSONParserError, [
        {
            key: "footprint",
            get: function get() {
                return "".concat(this.path, "+").concat(this.source, "+").concat(this.code, "+").concat(this.message);
            }
        }
    ]);
    return JSONParserError;
}(_wrapNativeSuper(Error));
setErrorName(JSONParserError);
var JSONParserErrorGroup = /*#__PURE__*/ function(Error1) {
    "use strict";
    _inherits(JSONParserErrorGroup, Error1);
    var _super = _createSuper(JSONParserErrorGroup);
    function JSONParserErrorGroup(parser) {
        _classCallCheck(this, JSONParserErrorGroup);
        var _this;
        _this = _super.call(this);
        _this.files = parser;
        _this.message = "".concat(_this.errors.length, " error").concat(_this.errors.length > 1 ? "s" : "", " occurred while reading '").concat((0, _urlJs.toFileSystemPath)(parser.$refs._root$Ref.path), "'");
        _ono.Ono.extend(_assertThisInitialized(_this));
        return _this;
    }
    _createClass(JSONParserErrorGroup, [
        {
            key: "errors",
            get: function get() {
                return JSONParserErrorGroup.getParserErrors(this.files);
            }
        }
    ], [
        {
            key: "getParserErrors",
            value: function getParserErrors(parser) {
                var errors = [];
                var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                try {
                    for(var _iterator = Object.values(parser.$refs._$refs)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                        var $ref = _step.value;
                        if ($ref.errors) {
                            var _errors;
                            (_errors = errors).push.apply(_errors, _toConsumableArray($ref.errors));
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally{
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally{
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
                return errors;
            }
        }
    ]);
    return JSONParserErrorGroup;
}(_wrapNativeSuper(Error));
setErrorName(JSONParserErrorGroup);
var ParserError = /*#__PURE__*/ function(JSONParserError) {
    "use strict";
    _inherits(ParserError, JSONParserError);
    var _super = _createSuper(ParserError);
    function ParserError(message, source) {
        _classCallCheck(this, ParserError);
        var _this;
        _this = _super.call(this, "Error parsing ".concat(source, ": ").concat(message), source);
        _this.code = "EPARSER";
        return _this;
    }
    return ParserError;
}(JSONParserError);
setErrorName(ParserError);
var UnmatchedParserError = /*#__PURE__*/ function(JSONParserError) {
    "use strict";
    _inherits(UnmatchedParserError, JSONParserError);
    var _super = _createSuper(UnmatchedParserError);
    function UnmatchedParserError(source) {
        _classCallCheck(this, UnmatchedParserError);
        var _this;
        _this = _super.call(this, 'Could not find parser for "'.concat(source, '"'), source);
        _this.code = "EUNMATCHEDPARSER";
        return _this;
    }
    return UnmatchedParserError;
}(JSONParserError);
setErrorName(UnmatchedParserError);
var ResolverError = /*#__PURE__*/ function(JSONParserError) {
    "use strict";
    _inherits(ResolverError, JSONParserError);
    var _super = _createSuper(ResolverError);
    function ResolverError(ex, source) {
        _classCallCheck(this, ResolverError);
        var _this;
        _this = _super.call(this, ex.message || 'Error reading file "'.concat(source, '"'), source);
        _this.code = "ERESOLVER";
        if ("code" in ex) {
            _this.ioErrorCode = String(ex.code);
        }
        return _this;
    }
    return ResolverError;
}(JSONParserError);
setErrorName(ResolverError);
var UnmatchedResolverError = /*#__PURE__*/ function(JSONParserError) {
    "use strict";
    _inherits(UnmatchedResolverError, JSONParserError);
    var _super = _createSuper(UnmatchedResolverError);
    function UnmatchedResolverError(source) {
        _classCallCheck(this, UnmatchedResolverError);
        var _this;
        _this = _super.call(this, 'Could not find resolver for "'.concat(source, '"'), source);
        _this.code = "EUNMATCHEDRESOLVER";
        return _this;
    }
    return UnmatchedResolverError;
}(JSONParserError);
setErrorName(UnmatchedResolverError);
var MissingPointerError = /*#__PURE__*/ function(JSONParserError) {
    "use strict";
    _inherits(MissingPointerError, JSONParserError);
    var _super = _createSuper(MissingPointerError);
    function MissingPointerError(token, path) {
        _classCallCheck(this, MissingPointerError);
        var _this;
        _this = _super.call(this, 'Token "'.concat(token, '" does not exist.'), (0, _urlJs.stripHash)(path));
        _this.code = "EMISSINGPOINTER";
        return _this;
    }
    return MissingPointerError;
}(JSONParserError);
setErrorName(MissingPointerError);
var InvalidPointerError = /*#__PURE__*/ function(JSONParserError) {
    "use strict";
    _inherits(InvalidPointerError, JSONParserError);
    var _super = _createSuper(InvalidPointerError);
    function InvalidPointerError(pointer, path) {
        _classCallCheck(this, InvalidPointerError);
        var _this;
        _this = _super.call(this, 'Invalid $ref pointer "'.concat(pointer, '". Pointers must begin with "#/"'), (0, _urlJs.stripHash)(path));
        _this.code = "EINVALIDPOINTER";
        return _this;
    }
    return InvalidPointerError;
}(JSONParserError);
setErrorName(InvalidPointerError);
function setErrorName(err) {
    Object.defineProperty(err.prototype, "name", {
        value: err.name,
        enumerable: true
    });
}
function isHandledError(err) {
    return _instanceof(err, JSONParserError) || _instanceof(err, JSONParserErrorGroup);
}
function normalizeError(err) {
    if (err.path === null) {
        err.path = [];
    }
    return err;
}
