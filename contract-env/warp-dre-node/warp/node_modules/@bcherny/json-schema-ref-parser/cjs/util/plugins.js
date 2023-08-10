/**
 * Returns the given plugins as an array, rather than an object map.
 * All other methods in this module expect an array of plugins rather than an object map.
 *
 * @param  {object} plugins - A map of plugin objects
 * @return {object[]}
 */ "use strict";
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
    all: function() {
        return all;
    },
    filter: function() {
        return filter;
    },
    sort: function() {
        return sort;
    },
    run: function() {
        return run;
    }
});
function _instanceof(left, right) {
    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else {
        return left instanceof right;
    }
}
function all(plugins) {
    return Object.keys(plugins).filter(function(key) {
        return typeof plugins[key] === "object";
    }).map(function(key) {
        plugins[key].name = key;
        return plugins[key];
    });
}
function filter(plugins, method, file) {
    return plugins.filter(function(plugin) {
        return !!getResult(plugin, method, file);
    });
}
function sort(plugins) {
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = plugins[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var plugin = _step.value;
            plugin.order = plugin.order || Number.MAX_SAFE_INTEGER;
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
    return plugins.sort(function(a, b) {
        return a.order - b.order;
    });
}
function run(plugins, method, file, $refs) {
    var plugin, lastError, index = 0;
    return new Promise(function(resolve, reject) {
        var runNextPlugin = function runNextPlugin() {
            plugin = plugins[index++];
            if (!plugin) {
                // There are no more functions, so re-throw the last error
                return reject(lastError);
            }
            try {
                // console.log('  %s', plugin.name);
                var result = getResult(plugin, method, file, callback, $refs);
                if (result && typeof result.then === "function") {
                    // A promise was returned
                    result.then(onSuccess, onError);
                } else if (result !== undefined) {
                    // A synchronous result was returned
                    onSuccess(result);
                } else if (index === plugins.length) {
                    throw new Error("No promise has been returned or callback has been called.");
                }
            } catch (e) {
                onError(e);
            }
        };
        var callback = function callback(err, result) {
            if (err) {
                onError(err);
            } else {
                onSuccess(result);
            }
        };
        var onSuccess = function onSuccess(result) {
            // console.log('    success');
            resolve({
                plugin: plugin,
                result: result
            });
        };
        var onError = function onError(error) {
            // console.log('    %s', err.message || err);
            lastError = {
                plugin: plugin,
                error: error
            };
            runNextPlugin();
        };
        runNextPlugin();
    });
}
/**
 * Returns the value of the given property.
 * If the property is a function, then the result of the function is returned.
 * If the value is a RegExp, then it will be tested against the file URL.
 * If the value is an aray, then it will be compared against the file extension.
 *
 * @param   {object}   obj        - The object whose property/method is called
 * @param   {string}   prop       - The name of the property/method to invoke
 * @param   {object}   file       - A file info object, which will be passed to the method
 * @param   {function} [callback] - A callback function, which will be passed to the method
 * @returns {*}
 */ function getResult(obj, prop, file, callback, $refs) {
    var value = obj[prop];
    if (typeof value === "function") {
        return value.apply(obj, [
            file,
            callback,
            $refs
        ]);
    }
    if (!callback) {
        // The synchronous plugin functions (canParse and canRead)
        // allow a "shorthand" syntax, where the user can match
        // files by RegExp or by file extension.
        if (_instanceof(value, RegExp)) {
            return value.test(file.url);
        } else if (typeof value === "string") {
            return value === file.extension;
        } else if (Array.isArray(value)) {
            return value.indexOf(file.extension) !== -1;
        }
    }
    return value;
}
