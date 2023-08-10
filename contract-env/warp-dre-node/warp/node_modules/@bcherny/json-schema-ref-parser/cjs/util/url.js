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
    parse: function() {
        return parse;
    },
    resolve: function() {
        return resolve;
    },
    cwd: function() {
        return cwd;
    },
    getProtocol: function() {
        return getProtocol;
    },
    getExtension: function() {
        return getExtension;
    },
    stripQuery: function() {
        return stripQuery;
    },
    getHash: function() {
        return getHash;
    },
    stripHash: function() {
        return stripHash;
    },
    isHttp: function() {
        return isHttp;
    },
    isFileSystemPath: function() {
        return isFileSystemPath;
    },
    fromFileSystemPath: function() {
        return fromFileSystemPath;
    },
    toFileSystemPath: function() {
        return toFileSystemPath;
    },
    safePointerToPath: function() {
        return safePointerToPath;
    }
});
var _projectDirCjs = /*#__PURE__*/ _interopRequireDefault(require("./projectDir.cjs"));
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var isWindows = /^win/.test(globalThis.process ? globalThis.process.platform : undefined), forwardSlashPattern = /\//g, protocolPattern = /^(\w{2,}):\/\//i, jsonPointerSlash = /~1/g, jsonPointerTilde = /~0/g;
// RegExp patterns to URL-encode special characters in local filesystem paths
var urlEncodePatterns = [
    /\?/g,
    "%3F",
    /\#/g,
    "%23"
];
// RegExp patterns to URL-decode special characters for local filesystem paths
var urlDecodePatterns = [
    /\%23/g,
    "#",
    /\%24/g,
    "$",
    /\%26/g,
    "&",
    /\%2C/g,
    ",",
    /\%40/g,
    "@"
];
var parse = function(u) {
    return new URL(u);
};
function resolve(from, to) {
    var resolvedUrl = new URL(to, new URL(from, "resolve://"));
    if (resolvedUrl.protocol === "resolve:") {
        // `from` is a relative URL.
        var pathname = resolvedUrl.pathname, search = resolvedUrl.search, hash = resolvedUrl.hash;
        return pathname + search + hash;
    }
    return resolvedUrl.toString();
}
function cwd() {
    if (typeof window !== "undefined") {
        return location.href;
    }
    var path = process.cwd();
    var lastChar = path.slice(-1);
    if (lastChar === "/" || lastChar === "\\") {
        return path;
    } else {
        return path + "/";
    }
}
function getProtocol(path) {
    var match = protocolPattern.exec(path);
    if (match) {
        return match[1].toLowerCase();
    }
}
function getExtension(path) {
    var lastDot = path.lastIndexOf(".");
    if (lastDot >= 0) {
        return stripQuery(path.substr(lastDot).toLowerCase());
    }
    return "";
}
function stripQuery(path) {
    var queryIndex = path.indexOf("?");
    if (queryIndex >= 0) {
        path = path.substr(0, queryIndex);
    }
    return path;
}
function getHash(path) {
    var hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
        return path.substr(hashIndex);
    }
    return "#";
}
function stripHash(path) {
    var hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
        path = path.substr(0, hashIndex);
    }
    return path;
}
function isHttp(path) {
    var protocol = getProtocol(path);
    if (protocol === "http" || protocol === "https") {
        return true;
    } else if (protocol === undefined) {
        // There is no protocol.  If we're running in a browser, then assume it's HTTP.
        return typeof window !== "undefined";
    } else {
        // It's some other protocol, such as "ftp://", "mongodb://", etc.
        return false;
    }
}
function isFileSystemPath(path) {
    if (process.browser) {
        // We're running in a browser, so assume that all paths are URLs.
        // This way, even relative paths will be treated as URLs rather than as filesystem paths
        return false;
    }
    var protocol = getProtocol(path);
    return protocol === undefined || protocol === "file";
}
function fromFileSystemPath(path) {
    // Step 1: On Windows, replace backslashes with forward slashes,
    // rather than encoding them as "%5C"
    if (isWindows) {
        var hasProjectDir = path.toUpperCase().includes(_projectDirCjs.default.replace(/\\/g, "\\").toUpperCase());
        var hasProjectUri = path.toUpperCase().includes(_projectDirCjs.default.replace(/\\/g, "/").toUpperCase());
        if (hasProjectDir || hasProjectUri) {
            path = path.replace(/\\/g, "/");
        } else {
            path = "".concat(_projectDirCjs.default, "/").concat(path).replace(/\\/g, "/");
        }
    }
    // Step 2: `encodeURI` will take care of MOST characters
    path = encodeURI(path);
    // Step 3: Manually encode characters that are not encoded by `encodeURI`.
    // This includes characters such as "#" and "?", which have special meaning in URLs,
    // but are just normal characters in a filesystem path.
    for(var i = 0; i < urlEncodePatterns.length; i += 2){
        path = path.replace(urlEncodePatterns[i], urlEncodePatterns[i + 1]);
    }
    return path;
}
function toFileSystemPath(path, keepFileProtocol) {
    // Step 1: `decodeURI` will decode characters such as Cyrillic characters, spaces, etc.
    path = decodeURI(path);
    // Step 2: Manually decode characters that are not decoded by `decodeURI`.
    // This includes characters such as "#" and "?", which have special meaning in URLs,
    // but are just normal characters in a filesystem path.
    for(var i = 0; i < urlDecodePatterns.length; i += 2){
        path = path.replace(urlDecodePatterns[i], urlDecodePatterns[i + 1]);
    }
    // Step 3: If it's a "file://" URL, then format it consistently
    // or convert it to a local filesystem path
    var isFileUrl = path.substr(0, 7).toLowerCase() === "file://";
    if (isFileUrl) {
        // Strip-off the protocol, and the initial "/", if there is one
        path = path[7] === "/" ? path.substr(8) : path.substr(7);
        // insert a colon (":") after the drive letter on Windows
        if (isWindows && path[1] === "/") {
            path = path[0] + ":" + path.substr(1);
        }
        if (keepFileProtocol) {
            // Return the consistently-formatted "file://" URL
            path = "file:///" + path;
        } else {
            // Convert the "file://" URL to a local filesystem path.
            // On Windows, it will start with something like "C:/".
            // On Posix, it will start with "/"
            isFileUrl = false;
            path = isWindows ? path : "/" + path;
        }
    }
    // Step 4: Normalize Windows paths (unless it's a "file://" URL)
    if (isWindows && !isFileUrl) {
        // Replace forward slashes with backslashes
        path = path.replace(forwardSlashPattern, "\\");
        // Capitalize the drive letter
        if (path.substr(1, 2) === ":\\") {
            path = path[0].toUpperCase() + path.substr(1);
        }
    }
    return path;
}
function safePointerToPath(pointer) {
    if (pointer.length <= 1 || pointer[0] !== "#" || pointer[1] !== "/") {
        return [];
    }
    return pointer.slice(2).split("/").map(function(value) {
        return decodeURIComponent(value).replace(jsonPointerSlash, "/").replace(jsonPointerTilde, "~");
    });
}
