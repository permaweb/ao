"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, /**
 * This class is a map of JSON references and their resolved values.
 */ "default", {
    enumerable: true,
    get: function() {
        return $Refs;
    }
});
var _ono = require("@jsdevtools/ono");
var _refJs = /*#__PURE__*/ _interopRequireDefault(require("./ref.js"));
var _urlJs = /*#__PURE__*/ _interopRequireWildcard(require("./util/url.js"));
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
var isWindows = /^win/.test(globalThis.process ? globalThis.process.platform : undefined);
var getPathFromOs = function(filePath) {
    return isWindows ? filePath.replace(/\\/g, "/") : filePath;
};
function $Refs() {
    /**
   * Indicates whether the schema contains any circular references.
   *
   * @type {boolean}
   */ this.circular = false;
    /**
   * A map of paths/urls to {@link $Ref} objects
   *
   * @type {object}
   * @protected
   */ this._$refs = {};
    /**
   * The {@link $Ref} object that is the root of the JSON schema.
   *
   * @type {$Ref}
   * @protected
   */ this._root$Ref = null;
}
/**
 * Returns the paths of all the files/URLs that are referenced by the JSON schema,
 * including the schema itself.
 *
 * @param {...string|string[]} [types] - Only return paths of the given types ("file", "http", etc.)
 * @returns {string[]}
 */ $Refs.prototype.paths = function(types) {
    var paths = getPaths(this._$refs, arguments);
    return paths.map(function(path) {
        return getPathFromOs(path.decoded);
    });
};
/**
 * Returns the map of JSON references and their resolved values.
 *
 * @param {...string|string[]} [types] - Only return references of the given types ("file", "http", etc.)
 * @returns {object}
 */ $Refs.prototype.values = function(types) {
    var $refs = this._$refs;
    var paths = getPaths($refs, arguments);
    return paths.reduce(function(obj, path) {
        obj[getPathFromOs(path.decoded)] = $refs[path.encoded].value;
        return obj;
    }, {});
};
/**
 * Returns a POJO (plain old JavaScript object) for serialization as JSON.
 *
 * @returns {object}
 */ $Refs.prototype.toJSON = $Refs.prototype.values;
/**
 * Determines whether the given JSON reference exists.
 *
 * @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
 * @param {$RefParserOptions} [options]
 * @returns {boolean}
 */ $Refs.prototype.exists = function(path, options) {
    try {
        this._resolve(path, "", options);
        return true;
    } catch (e) {
        return false;
    }
};
/**
 * Resolves the given JSON reference and returns the resolved value.
 *
 * @param {string} path - The path being resolved, with a JSON pointer in the hash
 * @param {$RefParserOptions} [options]
 * @returns {*} - Returns the resolved value
 */ $Refs.prototype.get = function(path, options) {
    return this._resolve(path, "", options).value;
};
/**
 * Sets the value of a nested property within this {@link $Ref#value}.
 * If the property, or any of its parents don't exist, they will be created.
 *
 * @param {string} path - The path of the property to set, optionally with a JSON pointer in the hash
 * @param {*} value - The value to assign
 */ $Refs.prototype.set = function(path, value) {
    var absPath = _urlJs.resolve(this._root$Ref.path, path);
    var withoutHash = _urlJs.stripHash(absPath);
    var $ref = this._$refs[withoutHash];
    if (!$ref) {
        throw (0, _ono.ono)('Error resolving $ref pointer "'.concat(path, '". \n"').concat(withoutHash, '" not found.'));
    }
    $ref.set(absPath, value);
};
/**
 * Creates a new {@link $Ref} object and adds it to this {@link $Refs} object.
 *
 * @param {string} path  - The file path or URL of the referenced file
 */ $Refs.prototype._add = function(path) {
    var withoutHash = _urlJs.stripHash(path);
    var $ref = new _refJs.default();
    $ref.path = withoutHash;
    $ref.$refs = this;
    this._$refs[withoutHash] = $ref;
    this._root$Ref = this._root$Ref || $ref;
    return $ref;
};
/**
 * Resolves the given JSON reference.
 *
 * @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
 * @param {string} pathFromRoot - The path of `obj` from the schema root
 * @param {$RefParserOptions} [options]
 * @returns {Pointer}
 * @protected
 */ $Refs.prototype._resolve = function(path, pathFromRoot, options) {
    var absPath = _urlJs.resolve(this._root$Ref.path, path);
    var withoutHash = _urlJs.stripHash(absPath);
    var $ref = this._$refs[withoutHash];
    if (!$ref) {
        throw (0, _ono.ono)('Error resolving $ref pointer "'.concat(path, '". \n"').concat(withoutHash, '" not found.'));
    }
    return $ref.resolve(absPath, options, path, pathFromRoot);
};
/**
 * Returns the specified {@link $Ref} object, or undefined.
 *
 * @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
 * @returns {$Ref|undefined}
 * @protected
 */ $Refs.prototype._get$Ref = function(path) {
    path = _urlJs.resolve(this._root$Ref.path, path);
    var withoutHash = _urlJs.stripHash(path);
    return this._$refs[withoutHash];
};
/**
 * Returns the encoded and decoded paths keys of the given object.
 *
 * @param {object} $refs - The object whose keys are URL-encoded paths
 * @param {...string|string[]} [types] - Only return paths of the given types ("file", "http", etc.)
 * @returns {object[]}
 */ function getPaths($refs, types) {
    var paths = Object.keys($refs);
    // Filter the paths by type
    types = Array.isArray(types[0]) ? types[0] : Array.prototype.slice.call(types);
    if (types.length > 0 && types[0]) {
        paths = paths.filter(function(key) {
            return types.indexOf($refs[key].pathType) !== -1;
        });
    }
    // Decode local filesystem paths
    return paths.map(function(path) {
        return {
            encoded: path,
            decoded: $refs[path].pathType === "file" ? _urlJs.toFileSystemPath(path, true) : path
        };
    });
}
