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
var _fs = /*#__PURE__*/ _interopRequireDefault(require("fs"));
var _ono = require("@jsdevtools/ono");
var _urlJs = /*#__PURE__*/ _interopRequireWildcard(require("../util/url.js"));
var _errorsJs = require("../util/errors.js");
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
var _default = {
    /**
   * The order that this resolver will run, in relation to other resolvers.
   *
   * @type {number}
   */ order: 100,
    /**
   * Determines whether this resolver can read a given file reference.
   * Resolvers that return true will be tried, in order, until one successfully resolves the file.
   * Resolvers that return false will not be given a chance to resolve the file.
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @returns {boolean}
   */ canRead: function canRead(file) {
        return _urlJs.isFileSystemPath(file.url);
    },
    /**
   * Reads the given file and returns its raw contents as a Buffer.
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @returns {Promise<Buffer>}
   */ read: function read(file) {
        return new Promise(function(resolve, reject) {
            var path;
            try {
                path = _urlJs.toFileSystemPath(file.url);
            } catch (err) {
                reject(new _errorsJs.ResolverError(_ono.ono.uri(err, "Malformed URI: ".concat(file.url)), file.url));
            }
            // console.log('Opening file: %s', path);
            try {
                _fs.default.readFile(path, function(err, data) {
                    if (err) {
                        reject(new _errorsJs.ResolverError((0, _ono.ono)(err, 'Error opening file "'.concat(path, '"')), path));
                    } else {
                        resolve(data);
                    }
                });
            } catch (err1) {
                reject(new _errorsJs.ResolverError((0, _ono.ono)(err1, 'Error opening file "'.concat(path, '"')), path));
            }
        });
    }
};
