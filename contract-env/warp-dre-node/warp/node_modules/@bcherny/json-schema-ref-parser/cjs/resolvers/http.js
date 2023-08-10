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
var _urlJs = /*#__PURE__*/ _interopRequireWildcard(require("../util/url.js"));
var _errorsJs = require("../util/errors.js");
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
   */ order: 200,
    /**
   * HTTP headers to send when downloading files.
   *
   * @example:
   * {
   *   "User-Agent": "JSON Schema $Ref Parser",
   *   Accept: "application/json"
   * }
   *
   * @type {object}
   */ headers: null,
    /**
   * HTTP request timeout (in milliseconds).
   *
   * @type {number}
   */ timeout: 5000,
    /**
   * The maximum number of HTTP redirects to follow.
   * To disable automatic following of redirects, set this to zero.
   *
   * @type {number}
   */ redirects: 5,
    /**
   * The `withCredentials` option of XMLHttpRequest.
   * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
   *
   * @type {boolean}
   */ withCredentials: false,
    /**
   * Determines whether this resolver can read a given file reference.
   * Resolvers that return true will be tried in order, until one successfully resolves the file.
   * Resolvers that return false will not be given a chance to resolve the file.
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @returns {boolean}
   */ canRead: function canRead(file) {
        return _urlJs.isHttp(file.url);
    },
    /**
   * Reads the given URL and returns its raw contents as a Buffer.
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @returns {Promise<Buffer>}
   */ read: function read(file) {
        var u = _urlJs.parse(file.url);
        if (typeof window !== "undefined" && !u.protocol) {
            // Use the protocol of the current page
            u.protocol = _urlJs.parse(location.href).protocol;
        }
        return download(u, this);
    }
};
/**
 * Downloads the given file.
 *
 * @param {Url|string} u        - The url to download (can be a parsed {@link Url} object)
 * @param {object} httpOptions  - The `options.resolve.http` object
 * @param {number} [redirects]  - The redirect URLs that have already been followed
 *
 * @returns {Promise<Buffer>}
 * The promise resolves with the raw downloaded data, or rejects if there is an HTTP error.
 */ function download(u, httpOptions, redirects) {
    u = _urlJs.parse(u);
    redirects = redirects || [];
    redirects.push(u.href);
    return get(u, httpOptions).then(function(res) {
        if (res.status >= 400) {
            throw (0, _ono.ono)({
                status: res.statusCode
            }, "HTTP ERROR ".concat(res.status));
        } else if (res.status >= 300) {
            if (redirects.length > httpOptions.redirects) {
                throw new _errorsJs.ResolverError((0, _ono.ono)({
                    status: res.status
                }, "Error downloading ".concat(redirects[0], ". \nToo many redirects: \n  ").concat(redirects.join(" \n  "))));
            } else if (!res.headers.location) {
                throw (0, _ono.ono)({
                    status: res.status
                }, "HTTP ".concat(res.status, " redirect with no location header"));
            } else {
                // console.log('HTTP %d redirect %s -> %s', res.status, u.href, res.headers.location);
                var redirectTo = _urlJs.resolve(u, res.headers.location);
                return download(redirectTo, httpOptions, redirects);
            }
        } else {
            return res.body ? res.arrayBuffer().then(function(buf) {
                return Buffer.from(buf);
            }) : Buffer.alloc(0);
        }
    }).catch(function(err) {
        throw new _errorsJs.ResolverError((0, _ono.ono)(err, "Error downloading ".concat(u.href)), u.href);
    });
}
/**
 * Sends an HTTP GET request.
 *
 * @param {Url} u - A parsed {@link Url} object
 * @param {object} httpOptions - The `options.resolve.http` object
 *
 * @returns {Promise<Response>}
 * The promise resolves with the HTTP Response object.
 */ function get(u, httpOptions) {
    var controller;
    var timeoutId;
    if (httpOptions.timeout) {
        controller = new AbortController();
        timeoutId = setTimeout(function() {
            return controller.abort();
        }, httpOptions.timeout);
    }
    return fetch(u, {
        method: "GET",
        headers: httpOptions.headers || {},
        credentials: httpOptions.withCredentials ? "include" : "same-origin",
        signal: controller ? controller.signal : null
    }).then(function(response) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        return response;
    });
}
