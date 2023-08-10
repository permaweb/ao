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
var _refJs = /*#__PURE__*/ _interopRequireDefault(require("./ref.js"));
var _pointerJs = /*#__PURE__*/ _interopRequireDefault(require("./pointer.js"));
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
var _default = bundle;
/**
 * Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
 * only has *internal* references, not any *external* references.
 * This method mutates the JSON schema object, adding new references and re-mapping existing ones.
 *
 * @param {$RefParser} parser
 * @param {$RefParserOptions} options
 */ function bundle(parser, options) {
    // console.log('Bundling $ref pointers in %s', parser.$refs._root$Ref.path);
    // Build an inventory of all $ref pointers in the JSON Schema
    var inventory = [];
    crawl(parser, "schema", parser.$refs._root$Ref.path + "#", "#", 0, inventory, parser.$refs, options);
    // Remap all $ref pointers
    remap(inventory);
}
/**
 * Recursively crawls the given value, and inventories all JSON references.
 *
 * @param {object} parent - The object containing the value to crawl. If the value is not an object or array, it will be ignored.
 * @param {string} key - The property key of `parent` to be crawled
 * @param {string} path - The full path of the property being crawled, possibly with a JSON Pointer in the hash
 * @param {string} pathFromRoot - The path of the property being crawled, from the schema root
 * @param {object[]} inventory - An array of already-inventoried $ref pointers
 * @param {$Refs} $refs
 * @param {$RefParserOptions} options
 */ function crawl(parent, key, path, pathFromRoot, indirections, inventory, $refs, options) {
    var obj = key === null ? parent : parent[key];
    if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj)) {
        if (_refJs.default.isAllowed$Ref(obj)) {
            inventory$Ref(parent, key, path, pathFromRoot, indirections, inventory, $refs, options);
        } else {
            // Crawl the object in a specific order that's optimized for bundling.
            // This is important because it determines how `pathFromRoot` gets built,
            // which later determines which keys get dereferenced and which ones get remapped
            var keys = Object.keys(obj).sort(function(a, b) {
                // Most people will expect references to be bundled into the the "definitions" property,
                // so we always crawl that property first, if it exists.
                if (a === "definitions") {
                    return -1;
                } else if (b === "definitions") {
                    return 1;
                } else {
                    // Otherwise, crawl the keys based on their length.
                    // This produces the shortest possible bundled references
                    return a.length - b.length;
                }
            });
            var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
            try {
                // eslint-disable-next-line no-shadow
                for(var _iterator = keys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                    var _$key = _step.value;
                    var keyPath = _pointerJs.default.join(path, _$key);
                    var keyPathFromRoot = _pointerJs.default.join(pathFromRoot, _$key);
                    var value = obj[_$key];
                    if (_refJs.default.isAllowed$Ref(value)) {
                        inventory$Ref(obj, _$key, path, keyPathFromRoot, indirections, inventory, $refs, options);
                    } else {
                        crawl(obj, _$key, keyPath, keyPathFromRoot, indirections, inventory, $refs, options);
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
        }
    }
}
/**
 * Inventories the given JSON Reference (i.e. records detailed information about it so we can
 * optimize all $refs in the schema), and then crawls the resolved value.
 *
 * @param {object} $refParent - The object that contains a JSON Reference as one of its keys
 * @param {string} $refKey - The key in `$refParent` that is a JSON Reference
 * @param {string} path - The full path of the JSON Reference at `$refKey`, possibly with a JSON Pointer in the hash
 * @param {string} pathFromRoot - The path of the JSON Reference at `$refKey`, from the schema root
 * @param {object[]} inventory - An array of already-inventoried $ref pointers
 * @param {$Refs} $refs
 * @param {$RefParserOptions} options
 */ function inventory$Ref($refParent, $refKey, path, pathFromRoot, indirections, inventory, $refs, options) {
    var $ref = $refKey === null ? $refParent : $refParent[$refKey];
    var $refPath = _urlJs.resolve(path, $ref.$ref);
    var pointer = $refs._resolve($refPath, pathFromRoot, options);
    if (pointer === null) {
        return;
    }
    var depth = _pointerJs.default.parse(pathFromRoot).length;
    var file = _urlJs.stripHash(pointer.path);
    var hash = _urlJs.getHash(pointer.path);
    var external = file !== $refs._root$Ref.path;
    var extended = _refJs.default.isExtended$Ref($ref);
    indirections += pointer.indirections;
    var existingEntry = findInInventory(inventory, $refParent, $refKey);
    if (existingEntry) {
        // This $Ref has already been inventoried, so we don't need to process it again
        if (depth < existingEntry.depth || indirections < existingEntry.indirections) {
            removeFromInventory(inventory, existingEntry);
        } else {
            return;
        }
    }
    inventory.push({
        $ref: $ref,
        parent: $refParent,
        key: $refKey,
        pathFromRoot: pathFromRoot,
        depth: depth,
        file: file,
        hash: hash,
        value: pointer.value,
        circular: pointer.circular,
        extended: extended,
        external: external,
        indirections: indirections
    });
    // Recursively crawl the resolved value
    if (!existingEntry || external) {
        crawl(pointer.value, null, pointer.path, pathFromRoot, indirections + 1, inventory, $refs, options);
    }
}
/**
 * Re-maps every $ref pointer, so that they're all relative to the root of the JSON Schema.
 * Each referenced value is dereferenced EXACTLY ONCE.  All subsequent references to the same
 * value are re-mapped to point to the first reference.
 *
 * @example:
 *  {
 *    first: { $ref: somefile.json#/some/part },
 *    second: { $ref: somefile.json#/another/part },
 *    third: { $ref: somefile.json },
 *    fourth: { $ref: somefile.json#/some/part/sub/part }
 *  }
 *
 * In this example, there are four references to the same file, but since the third reference points
 * to the ENTIRE file, that's the only one we need to dereference.  The other three can just be
 * remapped to point inside the third one.
 *
 * On the other hand, if the third reference DIDN'T exist, then the first and second would both need
 * to be dereferenced, since they point to different parts of the file. The fourth reference does NOT
 * need to be dereferenced, because it can be remapped to point inside the first one.
 *
 * @param {object[]} inventory
 */ function remap(inventory) {
    // Group & sort all the $ref pointers, so they're in the order that we need to dereference/remap them
    inventory.sort(function(a, b) {
        if (a.file !== b.file) {
            // Group all the $refs that point to the same file
            return a.file < b.file ? -1 : +1;
        } else if (a.hash !== b.hash) {
            // Group all the $refs that point to the same part of the file
            return a.hash < b.hash ? -1 : +1;
        } else if (a.circular !== b.circular) {
            // If the $ref points to itself, then sort it higher than other $refs that point to this $ref
            return a.circular ? -1 : +1;
        } else if (a.extended !== b.extended) {
            // If the $ref extends the resolved value, then sort it lower than other $refs that don't extend the value
            return a.extended ? +1 : -1;
        } else if (a.indirections !== b.indirections) {
            // Sort direct references higher than indirect references
            return a.indirections - b.indirections;
        } else if (a.depth !== b.depth) {
            // Sort $refs by how close they are to the JSON Schema root
            return a.depth - b.depth;
        } else {
            // Determine how far each $ref is from the "definitions" property.
            // Most people will expect references to be bundled into the the "definitions" property if possible.
            var aDefinitionsIndex = a.pathFromRoot.lastIndexOf("/definitions");
            var bDefinitionsIndex = b.pathFromRoot.lastIndexOf("/definitions");
            if (aDefinitionsIndex !== bDefinitionsIndex) {
                // Give higher priority to the $ref that's closer to the "definitions" property
                return bDefinitionsIndex - aDefinitionsIndex;
            } else {
                // All else is equal, so use the shorter path, which will produce the shortest possible reference
                return a.pathFromRoot.length - b.pathFromRoot.length;
            }
        }
    });
    var file, hash, pathFromRoot;
    var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
    try {
        for(var _iterator = inventory[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
            var entry = _step.value;
            // console.log('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);
            if (!entry.external) {
                // This $ref already resolves to the main JSON Schema file
                entry.$ref.$ref = entry.hash;
            } else if (entry.file === file && entry.hash === hash) {
                // This $ref points to the same value as the prevous $ref, so remap it to the same path
                entry.$ref.$ref = pathFromRoot;
            } else if (entry.file === file && entry.hash.indexOf(hash + "/") === 0) {
                // This $ref points to a sub-value of the prevous $ref, so remap it beneath that path
                entry.$ref.$ref = _pointerJs.default.join(pathFromRoot, _pointerJs.default.parse(entry.hash.replace(hash, "#")));
            } else {
                // We've moved to a new file or new hash
                file = entry.file;
                hash = entry.hash;
                pathFromRoot = entry.pathFromRoot;
                // This is the first $ref to point to this value, so dereference the value.
                // Any other $refs that point to the same value will point to this $ref instead
                entry.$ref = entry.parent[entry.key] = _refJs.default.dereference(entry.$ref, entry.value);
                if (entry.circular) {
                    // This $ref points to itself
                    entry.$ref.$ref = entry.pathFromRoot;
                }
            }
        // console.log('    new value: %s', (entry.$ref && entry.$ref.$ref) ? entry.$ref.$ref : '[object Object]');
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
}
/**
 * TODO
 */ function findInInventory(inventory, $refParent, $refKey) {
    for(var i = 0; i < inventory.length; i++){
        var existingEntry = inventory[i];
        if (existingEntry.parent === $refParent && existingEntry.key === $refKey) {
            return existingEntry;
        }
    }
}
function removeFromInventory(inventory, entry) {
    var index = inventory.indexOf(entry);
    inventory.splice(index, 1);
}
