const DEFAULT_GAS_LIMIT = 9_000_000_000_000_000;

var Module = (() => {
  var _scriptName = typeof document != 'undefined' ? document.currentScript?.src : undefined;
  if (typeof __filename != 'undefined') _scriptName ||= __filename;
  return (
    function (moduleArg = {}) {
      var moduleRtn;

      var Module = Object.assign({}, moduleArg);


      /**
       * Expose gas on the module
       *
       * This is how we track the amount of ops this WASM module has used,
       * and also how we refill the gas on each invocation of the WASM.
       */
      Module.gas = {
        limit: Module.computeLimit || DEFAULT_GAS_LIMIT,
        used: 0,
        use: (amount) => {
          Module.gas.used += amount;
        },
        refill: (amount) => {
          if (!amount) Module.gas.used = 0;
          else Module.gas.used = Math.max(Module.gas.used - amount, 0);
        },
        isEmpty: () => Module.gas.used > Module.gas.limit,
      };

      var readyPromiseResolve, readyPromiseReject;

      var readyPromise = new Promise((resolve, reject) => {
        readyPromiseResolve = resolve;
        readyPromiseReject = reject;
      });

      ["_malloc", "_memory", "___asyncjs__weavedrive_open", "___asyncjs__weavedrive_read", "___asyncjs__weavedrive_close", "_handle", "___indirect_function_table", "onRuntimeInitialized"].forEach(prop => {
        if (!Object.getOwnPropertyDescriptor(readyPromise, prop)) {
          Object.defineProperty(readyPromise, prop, {
            get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"),
            set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js")
          });
        }
      });

      var ENVIRONMENT_IS_WEB = typeof window == "object";

      var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";

      var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";

      var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

      if (Module["ENVIRONMENT"]) {
        throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
      }

      if (ENVIRONMENT_IS_NODE) { }

/* eslint-disable */ Module.locateFile = url => url;

      var moduleOverrides = Object.assign({}, Module);

      var arguments_ = [];

      var thisProgram = "./this.program";

      var quit_ = (status, toThrow) => {
        throw toThrow;
      };

      var scriptDirectory = "";

      function locateFile(path) {
        if (Module["locateFile"]) {
          return Module["locateFile"](path, scriptDirectory);
        }
        return scriptDirectory + path;
      }

      var read_, readAsync, readBinary;

      if (ENVIRONMENT_IS_NODE) {
        if (typeof process == "undefined" || !process.release || process.release.name !== "node") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
        var nodeVersion = process.versions.node;
        var numericVersion = nodeVersion.split(".").slice(0, 3);
        numericVersion = (numericVersion[0] * 1e4) + (numericVersion[1] * 100) + (numericVersion[2].split("-")[0] * 1);
        if (numericVersion < 16e4) {
          throw new Error("This emscripten-generated code requires node v16.0.0 (detected v" + nodeVersion + ")");
        }
        var fs = require("fs");
        var nodePath = require("path");
        scriptDirectory = __dirname + "/";
        read_ = (filename, binary) => {
          filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
          return fs.readFileSync(filename, binary ? undefined : "utf8");
        };
        readBinary = filename => {
          var ret = read_(filename, true);
          if (!ret.buffer) {
            ret = new Uint8Array(ret);
          }
          assert(ret.buffer);
          return ret;
        };
        readAsync = (filename, onload, onerror, binary = true) => {
          filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
          fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
            if (err) onerror(err); else onload(binary ? data.buffer : data);
          });
        };
        if (!Module["thisProgram"] && process.argv.length > 1) {
          thisProgram = process.argv[1].replace(/\\/g, "/");
        }
        arguments_ = process.argv.slice(2);
        quit_ = (status, toThrow) => {
          process.exitCode = status;
          throw toThrow;
        };
      } else if (ENVIRONMENT_IS_SHELL) {
        if ((typeof process == "object" && typeof require === "function") || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) {
          scriptDirectory = self.location.href;
        } else if (typeof document != "undefined" && document.currentScript) {
          scriptDirectory = document.currentScript.src;
        }
        if (_scriptName) {
          scriptDirectory = _scriptName;
        }
        if (scriptDirectory.startsWith("blob:")) {
          scriptDirectory = "";
        } else {
          scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
        }
        if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
        {
          read_ = url => {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText;
          };
          if (ENVIRONMENT_IS_WORKER) {
            readBinary = url => {
              var xhr = new XMLHttpRequest;
              xhr.open("GET", url, false);
              xhr.responseType = "arraybuffer";
              xhr.send(null);
              return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
            };
          }
          readAsync = (url, onload, onerror) => {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
              if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
                onload(xhr.response);
                return;
              }
              onerror();
            };
            xhr.onerror = onerror;
            xhr.send(null);
          };
        }
      } else {
        throw new Error("environment detection error");
      }

      var out = Module["print"] || console.log.bind(console);

      var err = Module["printErr"] || console.error.bind(console);

      Object.assign(Module, moduleOverrides);

      moduleOverrides = null;

      checkIncomingModuleAPI();

      if (Module["arguments"]) arguments_ = Module["arguments"];

      legacyModuleProp("arguments", "arguments_");

      if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

      legacyModuleProp("thisProgram", "thisProgram");

      if (Module["quit"]) quit_ = Module["quit"];

      legacyModuleProp("quit", "quit_");

      assert(typeof Module["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");

      assert(typeof Module["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");

      assert(typeof Module["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");

      assert(typeof Module["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");

      assert(typeof Module["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");

      assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");

      assert(typeof Module["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");

      assert(typeof Module["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");

      assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");

      legacyModuleProp("asm", "wasmExports");

      legacyModuleProp("read", "read_");

      legacyModuleProp("readAsync", "readAsync");

      legacyModuleProp("readBinary", "readBinary");

      legacyModuleProp("setWindowTitle", "setWindowTitle");

      assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.");

      var wasmBinary;

      if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

      legacyModuleProp("wasmBinary", "wasmBinary");

      if (typeof WebAssembly != "object") {
        err("no native wasm support detected");
      }

      function intArrayFromBase64(s) {
        if (typeof ENVIRONMENT_IS_NODE != "undefined" && ENVIRONMENT_IS_NODE) {
          var buf = Buffer.from(s, "base64");
          return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
        }
        var decoded = atob(s);
        var bytes = new Uint8Array(decoded.length);
        for (var i = 0; i < decoded.length; ++i) {
          bytes[i] = decoded.charCodeAt(i);
        }
        return bytes;
      }

      var wasmMemory;

      var ABORT = false;

      var EXITSTATUS;

/** @type {function(*, string=)} */ function assert(condition, text) {
        if (!condition) {
          abort("Assertion failed" + (text ? ": " + text : ""));
        }
      }

      var /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /* BigInt64Array type is not correctly defined in closure
/** not-@type {!BigInt64Array} */ HEAP64, /* BigUInt64Array type is not correctly defined in closure
/** not-t@type {!BigUint64Array} */ HEAPU64, /** @type {!Float64Array} */ HEAPF64;

      function updateMemoryViews() {
        var b = wasmMemory.buffer;
        Module["HEAP8"] = HEAP8 = new Int8Array(b);
        Module["HEAP16"] = HEAP16 = new Int16Array(b);
        Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
        Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
        Module["HEAP32"] = HEAP32 = new Int32Array(b);
        Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
        Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
        Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
        Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
        Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
      }

      assert(!Module["STACK_SIZE"], "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");

      assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined, "JS engine does not provide full typed array support");

      assert(!Module["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");

      assert(!Module["INITIAL_MEMORY"], "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");

      function writeStackCookie() {
        var max = _emscripten_stack_get_end();
        assert((max & 3) == 0);
        if (max == 0) {
          max += 4;
        }
        HEAPU32[((max) / 4)] = 34821223;
        HEAPU32[(((max) + (4)) / 4)] = 2310721022;
        HEAPU32[((0) / 4)] = 1668509029;
      }

      function checkStackCookie() {
        if (ABORT) return;
        var max = _emscripten_stack_get_end();
        if (max == 0) {
          max += 4;
        }
        var cookie1 = HEAPU32[((max) / 4)];
        var cookie2 = HEAPU32[(((max) + (4)) / 4)];
        if (cookie1 != 34821223 || cookie2 != 2310721022) {
          abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
        }
        if (HEAPU32[((0) / 4)] != 1668509029) /* 'emsc' */ {
          abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
        }
      }

      (function () {
        var h16 = new Int16Array(1);
        var h8 = new Int8Array(h16.buffer);
        h16[0] = 25459;
        if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
      })();

      var __ATPRERUN__ = [];

      var __ATINIT__ = [];

      var __ATPOSTRUN__ = [];

      var runtimeInitialized = false;

      function preRun() {
        if (Module["preRun"]) {
          if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
          while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift());
          }
        }
        callRuntimeCallbacks(__ATPRERUN__);
      }

      function initRuntime() {
        assert(!runtimeInitialized);
        runtimeInitialized = true;
        checkStackCookie();
        if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
        FS.ignorePermissions = false;
        TTY.init();
        callRuntimeCallbacks(__ATINIT__);
      }

      function postRun() {
        checkStackCookie();
        if (Module["postRun"]) {
          if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
          while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift());
          }
        }
        callRuntimeCallbacks(__ATPOSTRUN__);
      }

      function addOnPreRun(cb) {
        __ATPRERUN__.unshift(cb);
      }

      function addOnInit(cb) {
        __ATINIT__.unshift(cb);
      }

      function addOnPostRun(cb) {
        __ATPOSTRUN__.unshift(cb);
      }

      assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

      assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

      assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

      assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");

      var runDependencies = 0;

      var runDependencyWatcher = null;

      var dependenciesFulfilled = null;

      var runDependencyTracking = {};

      function getUniqueRunDependency(id) {
        var orig = id;
        while (1) {
          if (!runDependencyTracking[id]) return id;
          id = orig + Math.random();
        }
      }

      function addRunDependency(id) {
        runDependencies++;
        Module["monitorRunDependencies"]?.(runDependencies);
        if (id) {
          assert(!runDependencyTracking[id]);
          runDependencyTracking[id] = 1;
          if (runDependencyWatcher === null && typeof setInterval != "undefined") {
            runDependencyWatcher = setInterval(() => {
              if (ABORT) {
                clearInterval(runDependencyWatcher);
                runDependencyWatcher = null;
                return;
              }
              var shown = false;
              for (var dep in runDependencyTracking) {
                if (!shown) {
                  shown = true;
                  err("still waiting on run dependencies:");
                }
                err(`dependency: ${dep}`);
              }
              if (shown) {
                err("(end of list)");
              }
            }, 1e4);
          }
        } else {
          err("warning: run dependency added without ID");
        }
      }

      function removeRunDependency(id) {
        runDependencies--;
        Module["monitorRunDependencies"]?.(runDependencies);
        if (id) {
          assert(runDependencyTracking[id]);
          delete runDependencyTracking[id];
        } else {
          err("warning: run dependency removed without ID");
        }
        if (runDependencies == 0) {
          if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
          }
          if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback();
          }
        }
      }

/** @param {string|number=} what */ function abort(what) {
        Module["onAbort"]?.(what);
        what = "Aborted(" + what + ")";
        err(what);
        ABORT = true;
        EXITSTATUS = 1;
        if (what.indexOf("RuntimeError: unreachable") >= 0) {
          what += '. "unreachable" may be due to ASYNCIFY_STACK_SIZE not being large enough (try increasing it)';
        }
 /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
        readyPromiseReject(e);
        throw e;
      }

      var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

      function createExportWrapper(name, nargs) {
        return (...args) => {
          assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
          var f = wasmExports[name];
          assert(f, `exported native function \`${name}\` not found`);
          assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
          return f(...args);
        };
      }

      function findWasmBinary() {
        var f = "AOS.wasm";
        if (!isDataURI(f)) {
          return locateFile(f);
        }
        return f;
      }

      var wasmBinaryFile;

      function getBinarySync(file) {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      }

      function getBinaryPromise(binaryFile) {
        if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
          if (typeof fetch == "function" && !isFileURI(binaryFile)) {
            return fetch(binaryFile, {
              credentials: "same-origin"
            }).then(response => {
              if (!response["ok"]) {
                throw `failed to load wasm binary file at '${binaryFile}'`;
              }
              return response["arrayBuffer"]();
            }).catch(() => getBinarySync(binaryFile));
          } else if (readAsync) {
            return new Promise((resolve, reject) => {
              readAsync(binaryFile, response => resolve(new Uint8Array(/** @type{!ArrayBuffer} */(response))), reject);
            });
          }
        }
        return Promise.resolve().then(() => getBinarySync(binaryFile));
      }

      function instantiateArrayBuffer(binaryFile, imports, receiver) {
        return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(receiver, reason => {
          err(`failed to asynchronously prepare wasm: ${reason}`);
          if (isFileURI(wasmBinaryFile)) {
            err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
          }
          abort(reason);
        });
      }

      function instantiateAsync(binary, binaryFile, imports, callback) {
        if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
          return fetch(binaryFile, {
            credentials: "same-origin"
          }).then(response => {
   /** @suppress {checkTypes} */ var result = WebAssembly.instantiateStreaming(response, imports);
            return result.then(callback, function (reason) {
              err(`wasm streaming compile failed: ${reason}`);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(binaryFile, imports, callback);
            });
          });
        }
        return instantiateArrayBuffer(binaryFile, imports, callback);
      }

      function getWasmImports() {
        Asyncify.instrumentWasmImports(wasmImports);
        return {
          "env": wasmImports,
          "wasi_snapshot_preview1": wasmImports,
          metering: { usegas: function (gas) { Module.gas.use(gas); if (Module.gas.isEmpty()) throw Error('out of gas!') } },
        };
      }

      function createWasm() {
        var info = getWasmImports();
 /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
          wasmExports = instance.exports;
          wasmExports = Asyncify.instrumentWasmExports(wasmExports);
          wasmExports = applySignatureConversions(wasmExports);
          wasmMemory = wasmExports["memory"];
          assert(wasmMemory, "memory not found in wasm exports");
          updateMemoryViews();
          wasmTable = wasmExports["__indirect_function_table"];
          assert(wasmTable, "table not found in wasm exports");
          addOnInit(wasmExports["__wasm_call_ctors"]);
          removeRunDependency("wasm-instantiate");
          return wasmExports;
        }
        addRunDependency("wasm-instantiate");
        var trueModule = Module;
        function receiveInstantiationResult(result) {
          assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
          trueModule = null;
          receiveInstance(result["instance"]);
        }
        if (Module["instantiateWasm"]) {
          try {
            return Module["instantiateWasm"](info, receiveInstance);
          } catch (e) {
            err(`Module.instantiateWasm callback failed with error: ${e}`);
            readyPromiseReject(e);
          }
        }
        if (!wasmBinaryFile) wasmBinaryFile = findWasmBinary();
        instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
        return {};
      }

      function legacyModuleProp(prop, newName, incoming = true) {
        if (!Object.getOwnPropertyDescriptor(Module, prop)) {
          Object.defineProperty(Module, prop, {
            configurable: true,
            get() {
              let extra = incoming ? " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)" : "";
              abort(`\`Module.${prop}\` has been replaced by \`${newName}\`` + extra);
            }
          });
        }
      }

      function ignoredModuleProp(prop) {
        if (Object.getOwnPropertyDescriptor(Module, prop)) {
          abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
        }
      }

      function isExportedByForceFilesystem(name) {
        return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
      }

      function missingGlobal(sym, msg) {
        if (typeof globalThis != "undefined") {
          Object.defineProperty(globalThis, sym, {
            configurable: true,
            get() {
              warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
              return undefined;
            }
          });
        }
      }

      missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");

      missingGlobal("asm", "Please use wasmExports instead");

function missingLibrarySymbol(sym) {
 if (typeof globalThis != "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
  Object.defineProperty(globalThis, sym, {
   configurable: true,
   get() {
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    var librarySymbol = sym;
    if (!librarySymbol.startsWith("_")) {
     librarySymbol = "$" + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    warnOnce(msg);
    return undefined;
   }
  });
 }
 unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
 if (!Object.getOwnPropertyDescriptor(Module, sym)) {
  Object.defineProperty(Module, sym, {
   configurable: true,
   get() {
    var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
    if (isExportedByForceFilesystem(sym)) {
     msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
    }
    abort(msg);
   }
  });
 }
}

function __asyncjs__weavedrive_open(c_filename, mode) {
 return Asyncify.handleAsync(async () => {
  const filename = UTF8ToString(Number(c_filename));
  if (!Module.WeaveDrive) {
   return Promise.resolve(null);
  }
  const drive = Module.WeaveDrive(Module, FS);
  return await drive.open(filename);
 });
}

function __asyncjs__weavedrive_read(fd, dst_ptr, length) {
 return Asyncify.handleAsync(async () => {
  const drive = Module.WeaveDrive(Module, FS);
  return Promise.resolve(await drive.read(fd, dst_ptr, length));
 });
}
function __asyncjs__weavedrive_close(fd) {
 return Asyncify.handleAsync(async () => {
  const drive = Module.WeaveDrive(Module, FS);
  return drive.close(fd);
 });
}

/** @constructor */ function ExitStatus(status) {
        this.name = "ExitStatus";
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }

      var callRuntimeCallbacks = callbacks => {
        while (callbacks.length > 0) {
          callbacks.shift()(Module);
        }
      };

      var noExitRuntime = Module["noExitRuntime"] || true;

      var ptrToString = ptr => {
        assert(typeof ptr === "number");
        return "0x" + ptr.toString(16).padStart(8, "0");
      };

      var stackRestore = val => __emscripten_stack_restore(val);

      var stackSave = () => _emscripten_stack_get_current();

      var warnOnce = text => {
        warnOnce.shown ||= {};
        if (!warnOnce.shown[text]) {
          warnOnce.shown[text] = 1;
          if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
          err(text);
        }
      };

      var MAX_INT53 = 9007199254740992;

      var MIN_INT53 = -9007199254740992;

      var bigintToI53Checked = num => (num < MIN_INT53 || num > MAX_INT53) ? NaN : Number(num);

      var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx, maxBytesToRead) => {
        var endIdx = idx + maxBytesToRead;
        var endPtr = idx;
        while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
        if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
          return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
        }
        var str = "";
        while (idx < endPtr) {
          var u0 = heapOrArray[idx++];
          if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue;
          }
          var u1 = heapOrArray[idx++] & 63;
          if ((u0 & 224) == 192) {
            str += String.fromCharCode(((u0 & 31) << 6) | u1);
            continue;
          }
          var u2 = heapOrArray[idx++] & 63;
          if ((u0 & 240) == 224) {
            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
          } else {
            if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
          }
          if (u0 < 65536) {
            str += String.fromCharCode(u0);
          } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
          }
        }
        return str;
      };

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead) => {
        assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
        return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
      };

      function ___assert_fail(condition, filename, line, func) {
        condition = bigintToI53Checked(condition);
        filename = bigintToI53Checked(filename);
        func = bigintToI53Checked(func);
        abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
      }

      class ExceptionInfo {
        constructor(excPtr) {
          this.excPtr = excPtr;
          this.ptr = excPtr - 48;
        }
        set_type(type) {
          HEAPU64[(((this.ptr) + (8)) / 8)] = BigInt(type);
        }
        get_type() {
          return Number(HEAPU64[(((this.ptr) + (8)) / 8)]);
        }
        set_destructor(destructor) {
          HEAPU64[(((this.ptr) + (16)) / 8)] = BigInt(destructor);
        }
        get_destructor() {
          return Number(HEAPU64[(((this.ptr) + (16)) / 8)]);
        }
        set_caught(caught) {
          caught = caught ? 1 : 0;
          HEAP8[(this.ptr) + (24)] = caught;
        }
        get_caught() {
          return HEAP8[(this.ptr) + (24)] != 0;
        }
        set_rethrown(rethrown) {
          rethrown = rethrown ? 1 : 0;
          HEAP8[(this.ptr) + (25)] = rethrown;
        }
        get_rethrown() {
          return HEAP8[(this.ptr) + (25)] != 0;
        }
        init(type, destructor) {
          this.set_adjusted_ptr(0);
          this.set_type(type);
          this.set_destructor(destructor);
        }
        set_adjusted_ptr(adjustedPtr) {
          HEAPU64[(((this.ptr) + (32)) / 8)] = BigInt(adjustedPtr);
        }
        get_adjusted_ptr() {
          return Number(HEAPU64[(((this.ptr) + (32)) / 8)]);
        }
        get_exception_ptr() {
          var isPointer = ___cxa_is_pointer_type(this.get_type());
          if (isPointer) {
            return Number(HEAPU64[((this.excPtr) / 8)]);
          }
          var adjusted = this.get_adjusted_ptr();
          if (adjusted !== 0) return adjusted;
          return this.excPtr;
        }
      }

      var exceptionLast = 0;

      var uncaughtExceptionCount = 0;

      function ___cxa_throw(ptr, type, destructor) {
        ptr = bigintToI53Checked(ptr);
        type = bigintToI53Checked(type);
        destructor = bigintToI53Checked(destructor);
        var info = new ExceptionInfo(ptr);
        info.init(type, destructor);
        exceptionLast = ptr;
        uncaughtExceptionCount++;
        assert(false, "Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.");
      }

      var PATH = {
        isAbs: path => path.charAt(0) === "/",
        splitPath: filename => {
          var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
          return splitPathRe.exec(filename).slice(1);
        },
        normalizeArray: (parts, allowAboveRoot) => {
          var up = 0;
          for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
              parts.splice(i, 1);
            } else if (last === "..") {
              parts.splice(i, 1);
              up++;
            } else if (up) {
              parts.splice(i, 1);
              up--;
            }
          }
          if (allowAboveRoot) {
            for (; up; up--) {
              parts.unshift("..");
            }
          }
          return parts;
        },
        normalize: path => {
          var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
          path = PATH.normalizeArray(path.split("/").filter(p => !!p), !isAbsolute).join("/");
          if (!path && !isAbsolute) {
            path = ".";
          }
          if (path && trailingSlash) {
            path += "/";
          }
          return (isAbsolute ? "/" : "") + path;
        },
        dirname: path => {
          var result = PATH.splitPath(path), root = result[0], dir = result[1];
          if (!root && !dir) {
            return ".";
          }
          if (dir) {
            dir = dir.substr(0, dir.length - 1);
          }
          return root + dir;
        },
        basename: path => {
          if (path === "/") return "/";
          path = PATH.normalize(path);
          path = path.replace(/\/$/, "");
          var lastSlash = path.lastIndexOf("/");
          if (lastSlash === -1) return path;
          return path.substr(lastSlash + 1);
        },
        join: (...paths) => PATH.normalize(paths.join("/")),
        join2: (l, r) => PATH.normalize(l + "/" + r)
      };

      var initRandomFill = () => {
        if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
          return view => crypto.getRandomValues(view);
        } else if (ENVIRONMENT_IS_NODE) {
          try {
            var crypto_module = require("crypto");
            var randomFillSync = crypto_module["randomFillSync"];
            if (randomFillSync) {
              return view => crypto_module["randomFillSync"](view);
            }
            var randomBytes = crypto_module["randomBytes"];
            return view => (view.set(randomBytes(view.byteLength)), view);
          } catch (e) { }
        }
        abort("no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: (array) => { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };");
      };

      var randomFill = view => (randomFill = initRandomFill())(view);

      var PATH_FS = {
        resolve: (...args) => {
          var resolvedPath = "", resolvedAbsolute = false;
          for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = (i >= 0) ? args[i] : FS.cwd();
            if (typeof path != "string") {
              throw new TypeError("Arguments to path.resolve must be strings");
            } else if (!path) {
              return "";
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = PATH.isAbs(path);
          }
          resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(p => !!p), !resolvedAbsolute).join("/");
          return ((resolvedAbsolute ? "/" : "") + resolvedPath) || ".";
        },
        relative: (from, to) => {
          from = PATH_FS.resolve(from).substr(1);
          to = PATH_FS.resolve(to).substr(1);
          function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
              if (arr[start] !== "") break;
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
              if (arr[end] !== "") break;
            }
            if (start > end) return [];
            return arr.slice(start, end - start + 1);
          }
          var fromParts = trim(from.split("/"));
          var toParts = trim(to.split("/"));
          var length = Math.min(fromParts.length, toParts.length);
          var samePartsLength = length;
          for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
              samePartsLength = i;
              break;
            }
          }
          var outputParts = [];
          for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..");
          }
          outputParts = outputParts.concat(toParts.slice(samePartsLength));
          return outputParts.join("/");
        }
      };

      var FS_stdin_getChar_buffer = [];

      var lengthBytesUTF8 = str => {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
          var c = str.charCodeAt(i);
          if (c <= 127) {
            len++;
          } else if (c <= 2047) {
            len += 2;
          } else if (c >= 55296 && c <= 57343) {
            len += 4;
            ++i;
          } else {
            len += 3;
          }
        }
        return len;
      };

      var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
        assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
        if (!(maxBytesToWrite > 0)) return 0;
        var startIdx = outIdx;
        var endIdx = outIdx + maxBytesToWrite - 1;
        for (var i = 0; i < str.length; ++i) {
          var u = str.charCodeAt(i);
          if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | (u1 & 1023);
          }
          if (u <= 127) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u;
          } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 192 | (u >> 6);
            heap[outIdx++] = 128 | (u & 63);
          } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 224 | (u >> 12);
            heap[outIdx++] = 128 | ((u >> 6) & 63);
            heap[outIdx++] = 128 | (u & 63);
          } else {
            if (outIdx + 3 >= endIdx) break;
            if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
            heap[outIdx++] = 240 | (u >> 18);
            heap[outIdx++] = 128 | ((u >> 12) & 63);
            heap[outIdx++] = 128 | ((u >> 6) & 63);
            heap[outIdx++] = 128 | (u & 63);
          }
        }
        heap[outIdx] = 0;
        return outIdx - startIdx;
      };

/** @type {function(string, boolean=, number=)} */ function intArrayFromString(stringy, dontAddNull, length) {
        var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
        var u8array = new Array(len);
        var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
        if (dontAddNull) u8array.length = numBytesWritten;
        return u8array;
      }

      var FS_stdin_getChar = () => {
        if (!FS_stdin_getChar_buffer.length) {
          var result = null;
          if (ENVIRONMENT_IS_NODE) {
            var BUFSIZE = 256;
            var buf = Buffer.alloc(BUFSIZE);
            var bytesRead = 0;
   /** @suppress {missingProperties} */ var fd = process.stdin.fd;
            try {
              bytesRead = fs.readSync(fd, buf);
            } catch (e) {
              if (e.toString().includes("EOF")) bytesRead = 0; else throw e;
            }
            if (bytesRead > 0) {
              result = buf.slice(0, bytesRead).toString("utf-8");
            } else {
              result = null;
            }
          } else if (typeof window != "undefined" && typeof window.prompt == "function") {
            result = window.prompt("Input: ");
            if (result !== null) {
              result += "\n";
            }
          } else if (typeof readline == "function") {
            result = readline();
            if (result !== null) {
              result += "\n";
            }
          }
          if (!result) {
            return null;
          }
          FS_stdin_getChar_buffer = intArrayFromString(result, true);
        }
        return FS_stdin_getChar_buffer.shift();
      };

      var TTY = {
        ttys: [],
        init() { },
        shutdown() { },
        register(dev, ops) {
          TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
          };
          FS.registerDevice(dev, TTY.stream_ops);
        },
        stream_ops: {
          open(stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
              throw new FS.ErrnoError(43);
            }
            stream.tty = tty;
            stream.seekable = false;
          },
          close(stream) {
            stream.tty.ops.fsync(stream.tty);
          },
          fsync(stream) {
            stream.tty.ops.fsync(stream.tty);
          },
          read(stream, buffer, offset, length, pos) {
   /* ignored */ if (!stream.tty || !stream.tty.ops.get_char) {
              throw new FS.ErrnoError(60);
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = stream.tty.ops.get_char(stream.tty);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset + i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
              throw new FS.ErrnoError(60);
            }
            try {
              for (var i = 0; i < length; i++) {
                stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
              }
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        },
        default_tty_ops: {
          get_char(tty) {
            return FS_stdin_getChar();
          },
          put_char(tty, val) {
            if (val === null || val === 10) {
              out(UTF8ArrayToString(tty.output, 0));
              tty.output = [];
            } else {
              if (val != 0) tty.output.push(val);
            }
          },
          fsync(tty) {
            if (tty.output && tty.output.length > 0) {
              out(UTF8ArrayToString(tty.output, 0));
              tty.output = [];
            }
          },
          ioctl_tcgets(tty) {
            return {
              c_iflag: 25856,
              c_oflag: 5,
              c_cflag: 191,
              c_lflag: 35387,
              c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            };
          },
          ioctl_tcsets(tty, optional_actions, data) {
            return 0;
          },
          ioctl_tiocgwinsz(tty) {
            return [24, 80];
          }
        },
        default_tty1_ops: {
          put_char(tty, val) {
            if (val === null || val === 10) {
              err(UTF8ArrayToString(tty.output, 0));
              tty.output = [];
            } else {
              if (val != 0) tty.output.push(val);
            }
          },
          fsync(tty) {
            if (tty.output && tty.output.length > 0) {
              err(UTF8ArrayToString(tty.output, 0));
              tty.output = [];
            }
          }
        }
      };

      var zeroMemory = (address, size) => {
        HEAPU8.fill(0, address, address + size);
        return address;
      };

      var alignMemory = (size, alignment) => {
        assert(alignment, "alignment argument is required");
        return Math.ceil(size / alignment) * alignment;
      };

      var mmapAlloc = size => {
        size = alignMemory(size, 65536);
        var ptr = _emscripten_builtin_memalign(65536, size);
        if (!ptr) return 0;
        return zeroMemory(ptr, size);
      };

      var MEMFS = {
        ops_table: null,
        mount(mount) {
          return MEMFS.createNode(null, "/", 16384 | 511, /* 0777 */ 0);
        },
        createNode(parent, name, mode, dev) {
          if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(63);
          }
          MEMFS.ops_table ||= {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
          var node = FS.createNode(parent, name, mode, dev);
          if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {};
          } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null;
          } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream;
          } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream;
          }
          node.timestamp = Date.now();
          if (parent) {
            parent.contents[name] = node;
            parent.timestamp = node.timestamp;
          }
          return node;
        },
        getFileDataAsTypedArray(node) {
          if (!node.contents) return new Uint8Array(0);
          if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
          return new Uint8Array(node.contents);
        },
        expandFileStorage(node, newCapacity) {
          var prevCapacity = node.contents ? node.contents.length : 0;
          if (prevCapacity >= newCapacity) return;
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity);
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
        },
        resizeFileStorage(node, newSize) {
          if (node.usedBytes == newSize) return;
          if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0;
          } else {
            var oldContents = node.contents;
            node.contents = new Uint8Array(newSize);
            if (oldContents) {
              node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
            }
            node.usedBytes = newSize;
          }
        },
        node_ops: {
          getattr(node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
              attr.size = 4096;
            } else if (FS.isFile(node.mode)) {
              attr.size = node.usedBytes;
            } else if (FS.isLink(node.mode)) {
              attr.size = node.link.length;
            } else {
              attr.size = 0;
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr;
          },
          setattr(node, attr) {
            if (attr.mode !== undefined) {
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              node.timestamp = attr.timestamp;
            }
            if (attr.size !== undefined) {
              MEMFS.resizeFileStorage(node, attr.size);
            }
          },
          lookup(parent, name) {
            throw FS.genericErrors[44];
          },
          mknod(parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev);
          },
          rename(old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
              var new_node;
              try {
                new_node = FS.lookupNode(new_dir, new_name);
              } catch (e) { }
              if (new_node) {
                for (var i in new_node.contents) {
                  throw new FS.ErrnoError(55);
                }
              }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.parent.timestamp = Date.now();
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            new_dir.timestamp = old_node.parent.timestamp;
            old_node.parent = new_dir;
          },
          unlink(parent, name) {
            delete parent.contents[name];
            parent.timestamp = Date.now();
          },
          rmdir(parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
              throw new FS.ErrnoError(55);
            }
            delete parent.contents[name];
            parent.timestamp = Date.now();
          },
          readdir(node) {
            var entries = [".", ".."];
            for (var key of Object.keys(node.contents)) {
              entries.push(key);
            }
            return entries;
          },
          symlink(parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | /* 0777 */ 40960, 0);
            node.link = oldpath;
            return node;
          },
          readlink(node) {
            if (!FS.isLink(node.mode)) {
              throw new FS.ErrnoError(28);
            }
            return node.link;
          }
        },
        stream_ops: {
          read(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes) return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            assert(size >= 0);
            if (size > 8 && contents.subarray) {
              buffer.set(contents.subarray(position, position + size), offset);
            } else {
              for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
            }
            return size;
          },
          write(stream, buffer, offset, length, position, canOwn) {
            assert(!(buffer instanceof ArrayBuffer));
            if (buffer.buffer === HEAP8.buffer) {
              canOwn = false;
            }
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
              if (canOwn) {
                assert(position === 0, "canOwn must imply no weird position inside the file");
                node.contents = buffer.subarray(offset, offset + length);
                node.usedBytes = length;
                return length;
              } else if (node.usedBytes === 0 && position === 0) {
                node.contents = buffer.slice(offset, offset + length);
                node.usedBytes = length;
                return length;
              } else if (position + length <= node.usedBytes) {
                node.contents.set(buffer.subarray(offset, offset + length), position);
                return length;
              }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) {
              node.contents.set(buffer.subarray(offset, offset + length), position);
            } else {
              for (var i = 0; i < length; i++) {
                node.contents[position + i] = buffer[offset + i];
              }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length;
          },
          llseek(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
              position += stream.position;
            } else if (whence === 2) {
              if (FS.isFile(stream.node.mode)) {
                position += stream.node.usedBytes;
              }
            }
            if (position < 0) {
              throw new FS.ErrnoError(28);
            }
            return position;
          },
          allocate(stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
          },
          mmap(stream, length, position, prot, flags) {
            if (!FS.isFile(stream.node.mode)) {
              throw new FS.ErrnoError(43);
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
              allocated = false;
              ptr = contents.byteOffset;
            } else {
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              allocated = true;
              ptr = mmapAlloc(length);
              if (!ptr) {
                throw new FS.ErrnoError(48);
              }
              HEAP8.set(contents, ptr);
            }
            return {
              ptr: ptr,
              allocated: allocated
            };
          },
          msync(stream, buffer, offset, length, mmapFlags) {
            MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0;
          }
        }
      };

/** @param {boolean=} noRunDep */ var asyncLoad = (url, onload, onerror, noRunDep) => {
        var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : "";
        readAsync(url, arrayBuffer => {
          assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
          onload(new Uint8Array(arrayBuffer));
          if (dep) removeRunDependency(dep);
        }, event => {
          if (onerror) {
            onerror();
          } else {
            throw `Loading data file "${url}" failed.`;
          }
        });
        if (dep) addRunDependency(dep);
      };

      var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
        FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
      };

      var preloadPlugins = Module["preloadPlugins"] || [];

      var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
        if (typeof Browser != "undefined") Browser.init();
        var handled = false;
        preloadPlugins.forEach(plugin => {
          if (handled) return;
          if (plugin["canHandle"](fullname)) {
            plugin["handle"](byteArray, fullname, finish, onerror);
            handled = true;
          }
        });
        return handled;
      };

      var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency(`cp ${fullname}`);
        function processData(byteArray) {
          function finish(byteArray) {
            preFinish?.();
            if (!dontCreateFile) {
              FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            onload?.();
            removeRunDependency(dep);
          }
          if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
            onerror?.();
            removeRunDependency(dep);
          })) {
            return;
          }
          finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == "string") {
          asyncLoad(url, processData, onerror);
        } else {
          processData(url);
        }
      };

      var FS_modeStringToFlags = str => {
        var flagModes = {
          "r": 0,
          "r+": 2,
          "w": 512 | 64 | 1,
          "w+": 512 | 64 | 2,
          "a": 1024 | 64 | 1,
          "a+": 1024 | 64 | 2
        };
        var flags = flagModes[str];
        if (typeof flags == "undefined") {
          throw new Error(`Unknown file open mode: ${str}`);
        }
        return flags;
      };

      var FS_getMode = (canRead, canWrite) => {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      };

      var ERRNO_MESSAGES = {
        0: "Success",
        1: "Arg list too long",
        2: "Permission denied",
        3: "Address already in use",
        4: "Address not available",
        5: "Address family not supported by protocol family",
        6: "No more processes",
        7: "Socket already connected",
        8: "Bad file number",
        9: "Trying to read unreadable message",
        10: "Mount device busy",
        11: "Operation canceled",
        12: "No children",
        13: "Connection aborted",
        14: "Connection refused",
        15: "Connection reset by peer",
        16: "File locking deadlock error",
        17: "Destination address required",
        18: "Math arg out of domain of func",
        19: "Quota exceeded",
        20: "File exists",
        21: "Bad address",
        22: "File too large",
        23: "Host is unreachable",
        24: "Identifier removed",
        25: "Illegal byte sequence",
        26: "Connection already in progress",
        27: "Interrupted system call",
        28: "Invalid argument",
        29: "I/O error",
        30: "Socket is already connected",
        31: "Is a directory",
        32: "Too many symbolic links",
        33: "Too many open files",
        34: "Too many links",
        35: "Message too long",
        36: "Multihop attempted",
        37: "File or path name too long",
        38: "Network interface is not configured",
        39: "Connection reset by network",
        40: "Network is unreachable",
        41: "Too many open files in system",
        42: "No buffer space available",
        43: "No such device",
        44: "No such file or directory",
        45: "Exec format error",
        46: "No record locks available",
        47: "The link has been severed",
        48: "Not enough core",
        49: "No message of desired type",
        50: "Protocol not available",
        51: "No space left on device",
        52: "Function not implemented",
        53: "Socket is not connected",
        54: "Not a directory",
        55: "Directory not empty",
        56: "State not recoverable",
        57: "Socket operation on non-socket",
        59: "Not a typewriter",
        60: "No such device or address",
        61: "Value too large for defined data type",
        62: "Previous owner died",
        63: "Not super-user",
        64: "Broken pipe",
        65: "Protocol error",
        66: "Unknown protocol",
        67: "Protocol wrong type for socket",
        68: "Math result not representable",
        69: "Read only file system",
        70: "Illegal seek",
        71: "No such process",
        72: "Stale file handle",
        73: "Connection timed out",
        74: "Text file busy",
        75: "Cross-device link",
        100: "Device not a stream",
        101: "Bad font file fmt",
        102: "Invalid slot",
        103: "Invalid request code",
        104: "No anode",
        105: "Block device required",
        106: "Channel number out of range",
        107: "Level 3 halted",
        108: "Level 3 reset",
        109: "Link number out of range",
        110: "Protocol driver not attached",
        111: "No CSI structure available",
        112: "Level 2 halted",
        113: "Invalid exchange",
        114: "Invalid request descriptor",
        115: "Exchange full",
        116: "No data (for no delay io)",
        117: "Timer expired",
        118: "Out of streams resources",
        119: "Machine is not on the network",
        120: "Package not installed",
        121: "The object is remote",
        122: "Advertise error",
        123: "Srmount error",
        124: "Communication error on send",
        125: "Cross mount point (not really error)",
        126: "Given log. name not unique",
        127: "f.d. invalid for this operation",
        128: "Remote address changed",
        129: "Can   access a needed shared lib",
        130: "Accessing a corrupted shared lib",
        131: ".lib section in a.out corrupted",
        132: "Attempting to link in too many libs",
        133: "Attempting to exec a shared library",
        135: "Streams pipe error",
        136: "Too many users",
        137: "Socket type not supported",
        138: "Not supported",
        139: "Protocol family not supported",
        140: "Can't send after socket shutdown",
        141: "Too many references",
        142: "Host is down",
        148: "No medium (in tape drive)",
        156: "Level 2 not synchronized"
      };

      var ERRNO_CODES = {
        "EPERM": 63,
        "ENOENT": 44,
        "ESRCH": 71,
        "EINTR": 27,
        "EIO": 29,
        "ENXIO": 60,
        "E2BIG": 1,
        "ENOEXEC": 45,
        "EBADF": 8,
        "ECHILD": 12,
        "EAGAIN": 6,
        "EWOULDBLOCK": 6,
        "ENOMEM": 48,
        "EACCES": 2,
        "EFAULT": 21,
        "ENOTBLK": 105,
        "EBUSY": 10,
        "EEXIST": 20,
        "EXDEV": 75,
        "ENODEV": 43,
        "ENOTDIR": 54,
        "EISDIR": 31,
        "EINVAL": 28,
        "ENFILE": 41,
        "EMFILE": 33,
        "ENOTTY": 59,
        "ETXTBSY": 74,
        "EFBIG": 22,
        "ENOSPC": 51,
        "ESPIPE": 70,
        "EROFS": 69,
        "EMLINK": 34,
        "EPIPE": 64,
        "EDOM": 18,
        "ERANGE": 68,
        "ENOMSG": 49,
        "EIDRM": 24,
        "ECHRNG": 106,
        "EL2NSYNC": 156,
        "EL3HLT": 107,
        "EL3RST": 108,
        "ELNRNG": 109,
        "EUNATCH": 110,
        "ENOCSI": 111,
        "EL2HLT": 112,
        "EDEADLK": 16,
        "ENOLCK": 46,
        "EBADE": 113,
        "EBADR": 114,
        "EXFULL": 115,
        "ENOANO": 104,
        "EBADRQC": 103,
        "EBADSLT": 102,
        "EDEADLOCK": 16,
        "EBFONT": 101,
        "ENOSTR": 100,
        "ENODATA": 116,
        "ETIME": 117,
        "ENOSR": 118,
        "ENONET": 119,
        "ENOPKG": 120,
        "EREMOTE": 121,
        "ENOLINK": 47,
        "EADV": 122,
        "ESRMNT": 123,
        "ECOMM": 124,
        "EPROTO": 65,
        "EMULTIHOP": 36,
        "EDOTDOT": 125,
        "EBADMSG": 9,
        "ENOTUNIQ": 126,
        "EBADFD": 127,
        "EREMCHG": 128,
        "ELIBACC": 129,
        "ELIBBAD": 130,
        "ELIBSCN": 131,
        "ELIBMAX": 132,
        "ELIBEXEC": 133,
        "ENOSYS": 52,
        "ENOTEMPTY": 55,
        "ENAMETOOLONG": 37,
        "ELOOP": 32,
        "EOPNOTSUPP": 138,
        "EPFNOSUPPORT": 139,
        "ECONNRESET": 15,
        "ENOBUFS": 42,
        "EAFNOSUPPORT": 5,
        "EPROTOTYPE": 67,
        "ENOTSOCK": 57,
        "ENOPROTOOPT": 50,
        "ESHUTDOWN": 140,
        "ECONNREFUSED": 14,
        "EADDRINUSE": 3,
        "ECONNABORTED": 13,
        "ENETUNREACH": 40,
        "ENETDOWN": 38,
        "ETIMEDOUT": 73,
        "EHOSTDOWN": 142,
        "EHOSTUNREACH": 23,
        "EINPROGRESS": 26,
        "EALREADY": 7,
        "EDESTADDRREQ": 17,
        "EMSGSIZE": 35,
        "EPROTONOSUPPORT": 66,
        "ESOCKTNOSUPPORT": 137,
        "EADDRNOTAVAIL": 4,
        "ENETRESET": 39,
        "EISCONN": 30,
        "ENOTCONN": 53,
        "ETOOMANYREFS": 141,
        "EUSERS": 136,
        "EDQUOT": 19,
        "ESTALE": 72,
        "ENOTSUP": 138,
        "ENOMEDIUM": 148,
        "EILSEQ": 25,
        "EOVERFLOW": 61,
        "ECANCELED": 11,
        "ENOTRECOVERABLE": 56,
        "EOWNERDEAD": 62,
        "ESTRPIPE": 135
      };

      var FS = {
        root: null,
        mounts: [],
        devices: {},
        streams: [],
        nextInode: 1,
        nameTable: null,
        currentPath: "/",
        initialized: false,
        ignorePermissions: true,
        ErrnoError: class extends Error {
          constructor(errno) {
            super(ERRNO_MESSAGES[errno]);
            this.name = "ErrnoError";
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          }
        },
        genericErrors: {},
        filesystems: null,
        syncFSRequests: 0,
        FSStream: class {
          constructor() {
            this.shared = {};
          }
          get object() {
            return this.node;
          }
          set object(val) {
            this.node = val;
          }
          get isRead() {
            return (this.flags & 2097155) !== 1;
          }
          get isWrite() {
            return (this.flags & 2097155) !== 0;
          }
          get isAppend() {
            return (this.flags & 1024);
          }
          get flags() {
            return this.shared.flags;
          }
          set flags(val) {
            this.shared.flags = val;
          }
          get position() {
            return this.shared.position;
          }
          set position(val) {
            this.shared.position = val;
          }
        },
        FSNode: class {
          constructor(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
            this.readMode = 292 | /*292*/ 73;
   /*73*/ this.writeMode = 146;
          }
  /*146*/ get read() {
            return (this.mode & this.readMode) === this.readMode;
          }
          set read(val) {
            val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
          }
          get write() {
            return (this.mode & this.writeMode) === this.writeMode;
          }
          set write(val) {
            val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
          }
          get isFolder() {
            return FS.isDir(this.mode);
          }
          get isDevice() {
            return FS.isChrdev(this.mode);
          }
        },
        lookupPath(path, opts = {}) {
          path = PATH_FS.resolve(path);
          if (!path) return {
            path: "",
            node: null
          };
          var defaults = {
            follow_mount: true,
            recurse_count: 0
          };
          opts = Object.assign(defaults, opts);
          if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(32);
          }
          var parts = path.split("/").filter(p => !!p);
          var current = FS.root;
          var current_path = "/";
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length - 1);
            if (islast && opts.parent) {
              break;
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
              if (!islast || (islast && opts.follow_mount)) {
                current = current.mounted.root;
              }
            }
            if (!islast || opts.follow) {
              var count = 0;
              while (FS.isLink(current.mode)) {
                var link = FS.readlink(current_path);
                current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                var lookup = FS.lookupPath(current_path, {
                  recurse_count: opts.recurse_count + 1
                });
                current = lookup.node;
                if (count++ > 40) {
                  throw new FS.ErrnoError(32);
                }
              }
            }
          }
          return {
            path: current_path,
            node: current
          };
        },
        getPath(node) {
          var path;
          while (true) {
            if (FS.isRoot(node)) {
              var mount = node.mount.mountpoint;
              if (!path) return mount;
              return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
            }
            path = path ? `${node.name}/${path}` : node.name;
            node = node.parent;
          }
        },
        hashName(parentid, name) {
          var hash = 0;
          for (var i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
          }
          return ((parentid + hash) >>> 0) % FS.nameTable.length;
        },
        hashAddNode(node) {
          var hash = FS.hashName(node.parent.id, node.name);
          node.name_next = FS.nameTable[hash];
          FS.nameTable[hash] = node;
        },
        hashRemoveNode(node) {
          var hash = FS.hashName(node.parent.id, node.name);
          if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next;
          } else {
            var current = FS.nameTable[hash];
            while (current) {
              if (current.name_next === node) {
                current.name_next = node.name_next;
                break;
              }
              current = current.name_next;
            }
          }
        },
        lookupNode(parent, name) {
          var errCode = FS.mayLookup(parent);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          var hash = FS.hashName(parent.id, name);
          for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
              return node;
            }
          }
          return FS.lookup(parent, name);
        },
        createNode(parent, name, mode, rdev) {
          assert(typeof parent == "object");
          var node = new FS.FSNode(parent, name, mode, rdev);
          FS.hashAddNode(node);
          return node;
        },
        destroyNode(node) {
          FS.hashRemoveNode(node);
        },
        isRoot(node) {
          return node === node.parent;
        },
        isMountpoint(node) {
          return !!node.mounted;
        },
        isFile(mode) {
          return (mode & 61440) === 32768;
        },
        isDir(mode) {
          return (mode & 61440) === 16384;
        },
        isLink(mode) {
          return (mode & 61440) === 40960;
        },
        isChrdev(mode) {
          return (mode & 61440) === 8192;
        },
        isBlkdev(mode) {
          return (mode & 61440) === 24576;
        },
        isFIFO(mode) {
          return (mode & 61440) === 4096;
        },
        isSocket(mode) {
          return (mode & 49152) === 49152;
        },
        flagsToPermissionString(flag) {
          var perms = ["r", "w", "rw"][flag & 3];
          if ((flag & 512)) {
            perms += "w";
          }
          return perms;
        },
        nodePermissions(node, perms) {
          if (FS.ignorePermissions) {
            return 0;
          }
          if (perms.includes("r") && !(node.mode & 292)) {
            return 2;
          } else if (perms.includes("w") && !(node.mode & 146)) {
            return 2;
          } else if (perms.includes("x") && !(node.mode & 73)) {
            return 2;
          }
          return 0;
        },
        mayLookup(dir) {
          if (!FS.isDir(dir.mode)) return 54;
          var errCode = FS.nodePermissions(dir, "x");
          if (errCode) return errCode;
          if (!dir.node_ops.lookup) return 2;
          return 0;
        },
        mayCreate(dir, name) {
          try {
            var node = FS.lookupNode(dir, name);
            return 20;
          } catch (e) { }
          return FS.nodePermissions(dir, "wx");
        },
        mayDelete(dir, name, isdir) {
          var node;
          try {
            node = FS.lookupNode(dir, name);
          } catch (e) {
            return e.errno;
          }
          var errCode = FS.nodePermissions(dir, "wx");
          if (errCode) {
            return errCode;
          }
          if (isdir) {
            if (!FS.isDir(node.mode)) {
              return 54;
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
              return 10;
            }
          } else {
            if (FS.isDir(node.mode)) {
              return 31;
            }
          }
          return 0;
        },
        mayOpen(node, flags) {
          if (!node) {
            return 44;
          }
          if (FS.isLink(node.mode)) {
            return 32;
          } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || (flags & 512)) {
              return 31;
            }
          }
          return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
        },
        MAX_OPEN_FDS: 4096,
        nextfd() {
          for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
            if (!FS.streams[fd]) {
              return fd;
            }
          }
          throw new FS.ErrnoError(33);
        },
        getStreamChecked(fd) {
          var stream = FS.getStream(fd);
          if (!stream) {
            throw new FS.ErrnoError(8);
          }
          return stream;
        },
        getStream: fd => FS.streams[fd],
        createStream(stream, fd = -1) {
          stream = Object.assign(new FS.FSStream, stream);
          if (fd == -1) {
            fd = FS.nextfd();
          }
          stream.fd = fd;
          FS.streams[fd] = stream;
          return stream;
        },
        closeStream(fd) {
          FS.streams[fd] = null;
        },
        dupStream(origStream, fd = -1) {
          var stream = FS.createStream(origStream, fd);
          stream.stream_ops?.dup?.(stream);
          return stream;
        },
        chrdev_stream_ops: {
          open(stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            stream.stream_ops.open?.(stream);
          },
          llseek() {
            throw new FS.ErrnoError(70);
          }
        },
        major: dev => ((dev) >> 8),
        minor: dev => ((dev) & 255),
        makedev: (ma, mi) => ((ma) << 8 | (mi)),
        registerDevice(dev, ops) {
          FS.devices[dev] = {
            stream_ops: ops
          };
        },
        getDevice: dev => FS.devices[dev],
        getMounts(mount) {
          var mounts = [];
          var check = [mount];
          while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push(...m.mounts);
          }
          return mounts;
        },
        syncfs(populate, callback) {
          if (typeof populate == "function") {
            callback = populate;
            populate = false;
          }
          FS.syncFSRequests++;
          if (FS.syncFSRequests > 1) {
            err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
          }
          var mounts = FS.getMounts(FS.root.mount);
          var completed = 0;
          function doCallback(errCode) {
            assert(FS.syncFSRequests > 0);
            FS.syncFSRequests--;
            return callback(errCode);
          }
          function done(errCode) {
            if (errCode) {
              if (!done.errored) {
                done.errored = true;
                return doCallback(errCode);
              }
              return;
            }
            if (++completed >= mounts.length) {
              doCallback(null);
            }
          }
          mounts.forEach(mount => {
            if (!mount.type.syncfs) {
              return done(null);
            }
            mount.type.syncfs(mount, populate, done);
          });
        },
        mount(type, opts, mountpoint) {
          if (typeof type == "string") {
            throw type;
          }
          var root = mountpoint === "/";
          var pseudo = !mountpoint;
          var node;
          if (root && FS.root) {
            throw new FS.ErrnoError(10);
          } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
              follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
              throw new FS.ErrnoError(10);
            }
            if (!FS.isDir(node.mode)) {
              throw new FS.ErrnoError(54);
            }
          }
          var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
          };
          var mountRoot = type.mount(mount);
          mountRoot.mount = mount;
          mount.root = mountRoot;
          if (root) {
            FS.root = mountRoot;
          } else if (node) {
            node.mounted = mount;
            if (node.mount) {
              node.mount.mounts.push(mount);
            }
          }
          return mountRoot;
        },
        unmount(mountpoint) {
          var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
          });
          if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(28);
          }
          var node = lookup.node;
          var mount = node.mounted;
          var mounts = FS.getMounts(mount);
          Object.keys(FS.nameTable).forEach(hash => {
            var current = FS.nameTable[hash];
            while (current) {
              var next = current.name_next;
              if (mounts.includes(current.mount)) {
                FS.destroyNode(current);
              }
              current = next;
            }
          });
          node.mounted = null;
          var idx = node.mount.mounts.indexOf(mount);
          assert(idx !== -1);
          node.mount.mounts.splice(idx, 1);
        },
        lookup(parent, name) {
          return parent.node_ops.lookup(parent, name);
        },
        mknod(path, mode, dev) {
          var lookup = FS.lookupPath(path, {
            parent: true
          });
          var parent = lookup.node;
          var name = PATH.basename(path);
          if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(28);
          }
          var errCode = FS.mayCreate(parent, name);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(63);
          }
          return parent.node_ops.mknod(parent, name, mode, dev);
        },
        create(path, mode) {
          mode = mode !== undefined ? mode : 438;
  /* 0666 */ mode &= 4095;
          mode |= 32768;
          return FS.mknod(path, mode, 0);
        },
        mkdir(path, mode) {
          mode = mode !== undefined ? mode : 511;
  /* 0777 */ mode &= 511 | 512;
          mode |= 16384;
          return FS.mknod(path, mode, 0);
        },
        mkdirTree(path, mode) {
          var dirs = path.split("/");
          var d = "";
          for (var i = 0; i < dirs.length; ++i) {
            if (!dirs[i]) continue;
            d += "/" + dirs[i];
            try {
              FS.mkdir(d, mode);
            } catch (e) {
              if (e.errno != 20) throw e;
            }
          }
        },
        mkdev(path, mode, dev) {
          if (typeof dev == "undefined") {
            dev = mode;
            mode = 438;
          }
  /* 0666 */ mode |= 8192;
          return FS.mknod(path, mode, dev);
        },
        symlink(oldpath, newpath) {
          if (!PATH_FS.resolve(oldpath)) {
            throw new FS.ErrnoError(44);
          }
          var lookup = FS.lookupPath(newpath, {
            parent: true
          });
          var parent = lookup.node;
          if (!parent) {
            throw new FS.ErrnoError(44);
          }
          var newname = PATH.basename(newpath);
          var errCode = FS.mayCreate(parent, newname);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(63);
          }
          return parent.node_ops.symlink(parent, newname, oldpath);
        },
        rename(old_path, new_path) {
          var old_dirname = PATH.dirname(old_path);
          var new_dirname = PATH.dirname(new_path);
          var old_name = PATH.basename(old_path);
          var new_name = PATH.basename(new_path);
          var lookup, old_dir, new_dir;
          lookup = FS.lookupPath(old_path, {
            parent: true
          });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, {
            parent: true
          });
          new_dir = lookup.node;
          if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
          if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(75);
          }
          var old_node = FS.lookupNode(old_dir, old_name);
          var relative = PATH_FS.relative(old_path, new_dirname);
          if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(28);
          }
          relative = PATH_FS.relative(new_path, old_dirname);
          if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(55);
          }
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) { }
          if (old_node === new_node) {
            return;
          }
          var isdir = FS.isDir(old_node.mode);
          var errCode = FS.mayDelete(old_dir, old_name, isdir);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(63);
          }
          if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
            throw new FS.ErrnoError(10);
          }
          if (new_dir !== old_dir) {
            errCode = FS.nodePermissions(old_dir, "w");
            if (errCode) {
              throw new FS.ErrnoError(errCode);
            }
          }
          FS.hashRemoveNode(old_node);
          try {
            old_dir.node_ops.rename(old_node, new_dir, new_name);
          } catch (e) {
            throw e;
          } finally {
            FS.hashAddNode(old_node);
          }
        },
        rmdir(path) {
          var lookup = FS.lookupPath(path, {
            parent: true
          });
          var parent = lookup.node;
          var name = PATH.basename(path);
          var node = FS.lookupNode(parent, name);
          var errCode = FS.mayDelete(parent, name, true);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(63);
          }
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
          parent.node_ops.rmdir(parent, name);
          FS.destroyNode(node);
        },
        readdir(path) {
          var lookup = FS.lookupPath(path, {
            follow: true
          });
          var node = lookup.node;
          if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(54);
          }
          return node.node_ops.readdir(node);
        },
        unlink(path) {
          var lookup = FS.lookupPath(path, {
            parent: true
          });
          var parent = lookup.node;
          if (!parent) {
            throw new FS.ErrnoError(44);
          }
          var name = PATH.basename(path);
          var node = FS.lookupNode(parent, name);
          var errCode = FS.mayDelete(parent, name, false);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(63);
          }
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
          parent.node_ops.unlink(parent, name);
          FS.destroyNode(node);
        },
        readlink(path) {
          var lookup = FS.lookupPath(path);
          var link = lookup.node;
          if (!link) {
            throw new FS.ErrnoError(44);
          }
          if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(28);
          }
          return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
        },
        stat(path, dontFollow) {
          var lookup = FS.lookupPath(path, {
            follow: !dontFollow
          });
          var node = lookup.node;
          if (!node) {
            throw new FS.ErrnoError(44);
          }
          if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(63);
          }
          return node.node_ops.getattr(node);
        },
        lstat(path) {
          return FS.stat(path, true);
        },
        chmod(path, mode, dontFollow) {
          var node;
          if (typeof path == "string") {
            var lookup = FS.lookupPath(path, {
              follow: !dontFollow
            });
            node = lookup.node;
          } else {
            node = path;
          }
          if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63);
          }
          node.node_ops.setattr(node, {
            mode: (mode & 4095) | (node.mode & ~4095),
            timestamp: Date.now()
          });
        },
        lchmod(path, mode) {
          FS.chmod(path, mode, true);
        },
        fchmod(fd, mode) {
          var stream = FS.getStreamChecked(fd);
          FS.chmod(stream.node, mode);
        },
        chown(path, uid, gid, dontFollow) {
          var node;
          if (typeof path == "string") {
            var lookup = FS.lookupPath(path, {
              follow: !dontFollow
            });
            node = lookup.node;
          } else {
            node = path;
          }
          if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63);
          }
          node.node_ops.setattr(node, {
            timestamp: Date.now()
          });
        },
        lchown(path, uid, gid) {
          FS.chown(path, uid, gid, true);
        },
        fchown(fd, uid, gid) {
          var stream = FS.getStreamChecked(fd);
          FS.chown(stream.node, uid, gid);
        },
        truncate(path, len) {
          if (len < 0) {
            throw new FS.ErrnoError(28);
          }
          var node;
          if (typeof path == "string") {
            var lookup = FS.lookupPath(path, {
              follow: true
            });
            node = lookup.node;
          } else {
            node = path;
          }
          if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63);
          }
          if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(31);
          }
          if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          var errCode = FS.nodePermissions(node, "w");
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
          });
        },
        ftruncate(fd, len) {
          var stream = FS.getStreamChecked(fd);
          if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(28);
          }
          FS.truncate(stream.node, len);
        },
        utime(path, atime, mtime) {
          var lookup = FS.lookupPath(path, {
            follow: true
          });
          var node = lookup.node;
          node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
          });
        },
        open(path, flags, mode) {
          if (path === "") {
            throw new FS.ErrnoError(44);
          }
          flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
          mode = typeof mode == "undefined" ? 438 : /* 0666 */ mode;
          if ((flags & 64)) {
            mode = (mode & 4095) | 32768;
          } else {
            mode = 0;
          }
          var node;
          if (typeof path == "object") {
            node = path;
          } else {
            path = PATH.normalize(path);
            try {
              var lookup = FS.lookupPath(path, {
                follow: !(flags & 131072)
              });
              node = lookup.node;
            } catch (e) { }
          }
          var created = false;
          if ((flags & 64)) {
            if (node) {
              if ((flags & 128)) {
                throw new FS.ErrnoError(20);
              }
            } else {
              node = FS.mknod(path, mode, 0);
              created = true;
            }
          }
          if (!node) {
            throw new FS.ErrnoError(44);
          }
          if (FS.isChrdev(node.mode)) {
            flags &= ~512;
          }
          if ((flags & 65536) && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
          if (!created) {
            var errCode = FS.mayOpen(node, flags);
            if (errCode) {
              throw new FS.ErrnoError(errCode);
            }
          }
          if ((flags & 512) && !created) {
            FS.truncate(node, 0);
          }
          flags &= ~(128 | 512 | 131072);
          var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
          });
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
          if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles) FS.readFiles = {};
            if (!(path in FS.readFiles)) {
              FS.readFiles[path] = 1;
            }
          }
          return stream;
        },
        close(stream) {
          if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8);
          }
          if (stream.getdents) stream.getdents = null;
          try {
            if (stream.stream_ops.close) {
              stream.stream_ops.close(stream);
            }
          } catch (e) {
            throw e;
          } finally {
            FS.closeStream(stream.fd);
          }
          stream.fd = null;
        },
        isClosed(stream) {
          return stream.fd === null;
        },
        llseek(stream, offset, whence) {
          if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8);
          }
          if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(70);
          }
          if (whence != 0 && whence != 1 && whence != 2) {
            throw new FS.ErrnoError(28);
          }
          stream.position = stream.stream_ops.llseek(stream, offset, whence);
          stream.ungotten = [];
          return stream.position;
        },
        read(stream, buffer, offset, length, position) {
          assert(offset >= 0);
          if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28);
          }
          if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8);
          }
          if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(8);
          }
          if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31);
          }
          if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(28);
          }
          var seeking = typeof position != "undefined";
          if (!seeking) {
            position = stream.position;
          } else if (!stream.seekable) {
            throw new FS.ErrnoError(70);
          }
          var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
          if (!seeking) stream.position += bytesRead;
          return bytesRead;
        },
        write(stream, buffer, offset, length, position, canOwn) {
          assert(offset >= 0);
          if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28);
          }
          if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8);
          }
          if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8);
          }
          if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31);
          }
          if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(28);
          }
          if (stream.seekable && stream.flags & 1024) {
            FS.llseek(stream, 0, 2);
          }
          var seeking = typeof position != "undefined";
          if (!seeking) {
            position = stream.position;
          } else if (!stream.seekable) {
            throw new FS.ErrnoError(70);
          }
          var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
          if (!seeking) stream.position += bytesWritten;
          return bytesWritten;
        },
        allocate(stream, offset, length) {
          if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8);
          }
          if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(28);
          }
          if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8);
          }
          if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(138);
          }
          stream.stream_ops.allocate(stream, offset, length);
        },
        mmap(stream, length, position, prot, flags) {
          if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
            throw new FS.ErrnoError(2);
          }
          if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(2);
          }
          if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(43);
          }
          return stream.stream_ops.mmap(stream, length, position, prot, flags);
        },
        msync(stream, buffer, offset, length, mmapFlags) {
          assert(offset >= 0);
          if (!stream.stream_ops.msync) {
            return 0;
          }
          return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
        },
        ioctl(stream, cmd, arg) {
          if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(59);
          }
          return stream.stream_ops.ioctl(stream, cmd, arg);
        },
        readFile(path, opts = {}) {
          opts.flags = opts.flags || 0;
          opts.encoding = opts.encoding || "binary";
          if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error(`Invalid encoding type "${opts.encoding}"`);
          }
          var ret;
          var stream = FS.open(path, opts.flags);
          var stat = FS.stat(path);
          var length = stat.size;
          var buf = new Uint8Array(length);
          FS.read(stream, buf, 0, length, 0);
          if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0);
          } else if (opts.encoding === "binary") {
            ret = buf;
          }
          FS.close(stream);
          return ret;
        },
        writeFile(path, data, opts = {}) {
          opts.flags = opts.flags || 577;
          var stream = FS.open(path, opts.flags, opts.mode);
          if (typeof data == "string") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
          } else if (ArrayBuffer.isView(data)) {
            FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
          } else {
            throw new Error("Unsupported data type");
          }
          FS.close(stream);
        },
        cwd: () => FS.currentPath,
        chdir(path) {
          var lookup = FS.lookupPath(path, {
            follow: true
          });
          if (lookup.node === null) {
            throw new FS.ErrnoError(44);
          }
          if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(54);
          }
          var errCode = FS.nodePermissions(lookup.node, "x");
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
          FS.currentPath = lookup.path;
        },
        createDefaultDirectories() {
          FS.mkdir("/tmp");
          FS.mkdir("/home");
          FS.mkdir("/home/web_user");
        },
        createDefaultDevices() {
          FS.mkdir("/dev");
          FS.registerDevice(FS.makedev(1, 3), {
            read: () => 0,
            write: (stream, buffer, offset, length, pos) => length
          });
          FS.mkdev("/dev/null", FS.makedev(1, 3));
          TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
          TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
          FS.mkdev("/dev/tty", FS.makedev(5, 0));
          FS.mkdev("/dev/tty1", FS.makedev(6, 0));
          var randomBuffer = new Uint8Array(1024), randomLeft = 0;
          var randomByte = () => {
            if (randomLeft === 0) {
              randomLeft = randomFill(randomBuffer).byteLength;
            }
            return randomBuffer[--randomLeft];
          };
          FS.createDevice("/dev", "random", randomByte);
          FS.createDevice("/dev", "urandom", randomByte);
          FS.mkdir("/dev/shm");
          FS.mkdir("/dev/shm/tmp");
        },
        createSpecialDirectories() {
          FS.mkdir("/proc");
          var proc_self = FS.mkdir("/proc/self");
          FS.mkdir("/proc/self/fd");
          FS.mount({
            mount() {
              var node = FS.createNode(proc_self, "fd", 16384 | 511, /* 0777 */ 73);
              node.node_ops = {
                lookup(parent, name) {
                  var fd = +name;
                  var stream = FS.getStreamChecked(fd);
                  var ret = {
                    parent: null,
                    mount: {
                      mountpoint: "fake"
                    },
                    node_ops: {
                      readlink: () => stream.path
                    }
                  };
                  ret.parent = ret;
                  return ret;
                }
              };
              return node;
            }
          }, {}, "/proc/self/fd");
        },
        createStandardStreams() {
          if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"]);
          } else {
            FS.symlink("/dev/tty", "/dev/stdin");
          }
          if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"]);
          } else {
            FS.symlink("/dev/tty", "/dev/stdout");
          }
          if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"]);
          } else {
            FS.symlink("/dev/tty1", "/dev/stderr");
          }
          var stdin = FS.open("/dev/stdin", 0);
          var stdout = FS.open("/dev/stdout", 1);
          var stderr = FS.open("/dev/stderr", 1);
          assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
          assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
          assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
        },
        staticInit() {
          [44].forEach(code => {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>";
          });
          FS.nameTable = new Array(4096);
          FS.mount(MEMFS, {}, "/");
          FS.createDefaultDirectories();
          FS.createDefaultDevices();
          FS.createSpecialDirectories();
          FS.filesystems = {
            "MEMFS": MEMFS
          };
        },
        init(input, output, error) {
          assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
          FS.init.initialized = true;
          Module["stdin"] = input || Module["stdin"];
          Module["stdout"] = output || Module["stdout"];
          Module["stderr"] = error || Module["stderr"];
          FS.createStandardStreams();
        },
        quit() {
          FS.init.initialized = false;
          _fflush(0);
          for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
              continue;
            }
            FS.close(stream);
          }
        },
        findObject(path, dontResolveLastLink) {
          var ret = FS.analyzePath(path, dontResolveLastLink);
          if (!ret.exists) {
            return null;
          }
          return ret.object;
        },
        analyzePath(path, dontResolveLastLink) {
          try {
            var lookup = FS.lookupPath(path, {
              follow: !dontResolveLastLink
            });
            path = lookup.path;
          } catch (e) { }
          var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
          };
          try {
            var lookup = FS.lookupPath(path, {
              parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
              follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/";
          } catch (e) {
            ret.error = e.errno;
          }
          return ret;
        },
        createPath(parent, path, canRead, canWrite) {
          parent = typeof parent == "string" ? parent : FS.getPath(parent);
          var parts = path.split("/").reverse();
          while (parts.length) {
            var part = parts.pop();
            if (!part) continue;
            var current = PATH.join2(parent, part);
            try {
              FS.mkdir(current);
            } catch (e) { }
            parent = current;
          }
          return current;
        },
        createFile(parent, name, properties, canRead, canWrite) {
          var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
          var mode = FS_getMode(canRead, canWrite);
          return FS.create(path, mode);
        },
        createDataFile(parent, name, data, canRead, canWrite, canOwn) {
          var path = name;
          if (parent) {
            parent = typeof parent == "string" ? parent : FS.getPath(parent);
            path = name ? PATH.join2(parent, name) : parent;
          }
          var mode = FS_getMode(canRead, canWrite);
          var node = FS.create(path, mode);
          if (data) {
            if (typeof data == "string") {
              var arr = new Array(data.length);
              for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
              data = arr;
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, 577);
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode);
          }
        },
        createDevice(parent, name, input, output) {
          var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
          var mode = FS_getMode(!!input, !!output);
          if (!FS.createDevice.major) FS.createDevice.major = 64;
          var dev = FS.makedev(FS.createDevice.major++, 0);
          FS.registerDevice(dev, {
            open(stream) {
              stream.seekable = false;
            },
            close(stream) {
              if (output?.buffer?.length) {
                output(10);
              }
            },
            read(stream, buffer, offset, length, pos) {
    /* ignored */ var bytesRead = 0;
              for (var i = 0; i < length; i++) {
                var result;
                try {
                  result = input();
                } catch (e) {
                  throw new FS.ErrnoError(29);
                }
                if (result === undefined && bytesRead === 0) {
                  throw new FS.ErrnoError(6);
                }
                if (result === null || result === undefined) break;
                bytesRead++;
                buffer[offset + i] = result;
              }
              if (bytesRead) {
                stream.node.timestamp = Date.now();
              }
              return bytesRead;
            },
            write(stream, buffer, offset, length, pos) {
              for (var i = 0; i < length; i++) {
                try {
                  output(buffer[offset + i]);
                } catch (e) {
                  throw new FS.ErrnoError(29);
                }
              }
              if (length) {
                stream.node.timestamp = Date.now();
              }
              return i;
            }
          });
          return FS.mkdev(path, mode, dev);
        },
        forceLoadFile(obj) {
          if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
          if (typeof XMLHttpRequest != "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
          } else if (read_) {
            try {
              obj.contents = intArrayFromString(read_(obj.url), true);
              obj.usedBytes = obj.contents.length;
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
          } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.");
          }
        },
        createLazyFile(parent, name, url, canRead, canWrite) {
          class LazyUint8Array {
            constructor() {
              this.lengthKnown = false;
              this.chunks = [];
            }
            get(idx) {
              if (idx > this.length - 1 || idx < 0) {
                return undefined;
              }
              var chunkOffset = idx % this.chunkSize;
              var chunkNum = (idx / this.chunkSize) | 0;
              return this.getter(chunkNum)[chunkOffset];
            }
            setDataGetter(getter) {
              this.getter = getter;
            }
            cacheLength() {
              var xhr = new XMLHttpRequest;
              xhr.open("HEAD", url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
              var chunkSize = 1024 * 1024;
              if (!hasByteServing) chunkSize = datalength;
              var doXHR = (from, to) => {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType("text/plain; charset=x-user-defined");
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
                }
                return intArrayFromString(xhr.responseText || "", true);
              };
              var lazyArray = this;
              lazyArray.setDataGetter(chunkNum => {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] == "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof lazyArray.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
              if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                out("LazyFiles on gzip forces download of the whole file when length is accessed");
              }
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
            }
            get length() {
              if (!this.lengthKnown) {
                this.cacheLength();
              }
              return this._length;
            }
            get chunkSize() {
              if (!this.lengthKnown) {
                this.cacheLength();
              }
              return this._chunkSize;
            }
          }
          if (typeof XMLHttpRequest != "undefined") {
            if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            var properties = {
              isDevice: false,
              contents: lazyArray
            };
          } else {
            var properties = {
              isDevice: false,
              url: url
            };
          }
          var node = FS.createFile(parent, name, properties, canRead, canWrite);
          if (properties.contents) {
            node.contents = properties.contents;
          } else if (properties.url) {
            node.contents = null;
            node.url = properties.url;
          }
          Object.defineProperties(node, {
            usedBytes: {
              get: function () {
                return this.contents.length;
              }
            }
          });
          var stream_ops = {};
          var keys = Object.keys(node.stream_ops);
          keys.forEach(key => {
            var fn = node.stream_ops[key];
            stream_ops[key] = (...args) => {
              FS.forceLoadFile(node);
              return fn(...args);
            };
          });
          function writeChunks(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= contents.length) return 0;
            var size = Math.min(contents.length - position, length);
            assert(size >= 0);
            if (contents.slice) {
              for (var i = 0; i < size; i++) {
                buffer[offset + i] = contents[position + i];
              }
            } else {
              for (var i = 0; i < size; i++) {
                buffer[offset + i] = contents.get(position + i);
              }
            }
            return size;
          }
          stream_ops.read = (stream, buffer, offset, length, position) => {
            FS.forceLoadFile(node);
            return writeChunks(stream, buffer, offset, length, position);
          };
          stream_ops.mmap = (stream, length, position, prot, flags) => {
            FS.forceLoadFile(node);
            var ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            writeChunks(stream, HEAP8, ptr, length, position);
            return {
              ptr: ptr,
              allocated: true
            };
          };
          node.stream_ops = stream_ops;
          return node;
        },
        absolutePath() {
          abort("FS.absolutePath has been removed; use PATH_FS.resolve instead");
        },
        createFolder() {
          abort("FS.createFolder has been removed; use FS.mkdir instead");
        },
        createLink() {
          abort("FS.createLink has been removed; use FS.symlink instead");
        },
        joinPath() {
          abort("FS.joinPath has been removed; use PATH.join instead");
        },
        mmapAlloc() {
          abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc");
        },
        standardizePath() {
          abort("FS.standardizePath has been removed; use PATH.normalize instead");
        }
      };

      var SYSCALLS = {
        DEFAULT_POLLMASK: 5,
        calculateAt(dirfd, path, allowEmpty) {
          if (PATH.isAbs(path)) {
            return path;
          }
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = SYSCALLS.getStreamFromFD(dirfd);
            dir = dirstream.path;
          }
          if (path.length == 0) {
            if (!allowEmpty) {
              throw new FS.ErrnoError(44);
            }
            return dir;
          }
          return PATH.join2(dir, path);
        },
        doStat(func, path, buf) {
          var stat = func(path);
          HEAP32[((buf) / 4)] = stat.dev;
          HEAP32[(((buf) + (4)) / 4)] = stat.mode;
          HEAPU64[(((buf) + (8)) / 8)] = BigInt(stat.nlink);
          HEAP32[(((buf) + (16)) / 4)] = stat.uid;
          HEAP32[(((buf) + (20)) / 4)] = stat.gid;
          HEAP32[(((buf) + (24)) / 4)] = stat.rdev;
          HEAP64[(((buf) + (32)) / 8)] = BigInt(stat.size);
          HEAP32[(((buf) + (40)) / 4)] = 4096;
          HEAP32[(((buf) + (44)) / 4)] = stat.blocks;
          var atime = stat.atime.getTime();
          var mtime = stat.mtime.getTime();
          var ctime = stat.ctime.getTime();
          HEAP64[(((buf) + (48)) / 8)] = BigInt(Math.floor(atime / 1e3));
          HEAPU64[(((buf) + (56)) / 8)] = BigInt((atime % 1e3) * 1e3);
          HEAP64[(((buf) + (64)) / 8)] = BigInt(Math.floor(mtime / 1e3));
          HEAPU64[(((buf) + (72)) / 8)] = BigInt((mtime % 1e3) * 1e3);
          HEAP64[(((buf) + (80)) / 8)] = BigInt(Math.floor(ctime / 1e3));
          HEAPU64[(((buf) + (88)) / 8)] = BigInt((ctime % 1e3) * 1e3);
          HEAP64[(((buf) + (96)) / 8)] = BigInt(stat.ino);
          return 0;
        },
        doMsync(addr, stream, len, flags, offset) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          if (flags & 2) {
            return 0;
          }
          var buffer = HEAPU8.slice(addr, addr + len);
          FS.msync(stream, buffer, offset, len, flags);
        },
        getStreamFromFD(fd) {
          var stream = FS.getStreamChecked(fd);
          return stream;
        },
        varargs: undefined,
        getStr(ptr) {
          var ret = UTF8ToString(ptr);
          return ret;
        }
      };

      function ___syscall_chmod(path, mode) {
        path = bigintToI53Checked(path);
        try {
          path = SYSCALLS.getStr(path);
          FS.chmod(path, mode);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_dup3(fd, newfd, flags) {
        try {
          var old = SYSCALLS.getStreamFromFD(fd);
          assert(!flags);
          if (old.fd === newfd) return -28;
          var existing = FS.getStream(newfd);
          if (existing) FS.close(existing);
          return FS.dupStream(old, newfd).fd;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_faccessat(dirfd, path, amode, flags) {
        path = bigintToI53Checked(path);
        try {
          path = SYSCALLS.getStr(path);
          assert(flags === 0);
          path = SYSCALLS.calculateAt(dirfd, path);
          if (amode & ~7) {
            return -28;
          }
          var lookup = FS.lookupPath(path, {
            follow: true
          });
          var node = lookup.node;
          if (!node) {
            return -44;
          }
          var perms = "";
          if (amode & 4) perms += "r";
          if (amode & 2) perms += "w";
          if (amode & 1) perms += "x";
          if (perms && /* otherwise, they've just passed F_OK */ FS.nodePermissions(node, perms)) {
            return -2;
          }
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_fchmod(fd, mode) {
        try {
          FS.fchmod(fd, mode);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_fchown32(fd, owner, group) {
        try {
          FS.fchown(fd, owner, group);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function syscallGetVarargP() {
        assert(SYSCALLS.varargs != undefined);
        var ret = Number(HEAPU64[((SYSCALLS.varargs) / 8)]);
        SYSCALLS.varargs += 8;
        return ret;
      }

      function syscallGetVarargI() {
        assert(SYSCALLS.varargs != undefined);
        var ret = HEAP32[((+SYSCALLS.varargs) / 4)];
        SYSCALLS.varargs += 4;
        return ret;
      }

      function ___syscall_fcntl64(fd, cmd, varargs) {
        varargs = bigintToI53Checked(varargs);
        SYSCALLS.varargs = varargs;
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          switch (cmd) {
            case 0:
              {
                var arg = syscallGetVarargI();
                if (arg < 0) {
                  return -28;
                }
                while (FS.streams[arg]) {
                  arg++;
                }
                var newStream;
                newStream = FS.dupStream(stream, arg);
                return newStream.fd;
              }

            case 1:
            case 2:
              return 0;

            case 3:
              return stream.flags;

            case 4:
              {
                var arg = syscallGetVarargI();
                stream.flags |= arg;
                return 0;
              }

            case 5:
              {
                var arg = syscallGetVarargP();
                var offset = 0;
                HEAP16[(((arg) + (offset)) / 2)] = 2;
                return 0;
              }

            case 6:
            case 7:
              return 0;
          }
          return -28;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_fstat64(fd, buf) {
        buf = bigintToI53Checked(buf);
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          return SYSCALLS.doStat(FS.stat, stream.path, buf);
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_ftruncate64(fd, length) {
        length = bigintToI53Checked(length);
        try {
          if (isNaN(length)) return 61;
          FS.ftruncate(fd, length);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
        assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
        return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
      };

      function ___syscall_getcwd(buf, size) {
        buf = bigintToI53Checked(buf);
        size = bigintToI53Checked(size);
        try {
          if (size === 0) return -28;
          var cwd = FS.cwd();
          var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
          if (size < cwdLengthInBytes) return -68;
          stringToUTF8(cwd, buf, size);
          return cwdLengthInBytes;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_ioctl(fd, op, varargs) {
        varargs = bigintToI53Checked(varargs);
        SYSCALLS.varargs = varargs;
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          switch (op) {
            case 21509:
              {
                if (!stream.tty) return -59;
                return 0;
              }

            case 21505:
              {
                if (!stream.tty) return -59;
                if (stream.tty.ops.ioctl_tcgets) {
                  var termios = stream.tty.ops.ioctl_tcgets(stream);
                  var argp = syscallGetVarargP();
                  HEAP32[((argp) / 4)] = termios.c_iflag || 0;
                  HEAP32[(((argp) + (4)) / 4)] = termios.c_oflag || 0;
                  HEAP32[(((argp) + (8)) / 4)] = termios.c_cflag || 0;
                  HEAP32[(((argp) + (12)) / 4)] = termios.c_lflag || 0;
                  for (var i = 0; i < 32; i++) {
                    HEAP8[(argp + i) + (17)] = termios.c_cc[i] || 0;
                  }
                  return 0;
                }
                return 0;
              }

            case 21510:
            case 21511:
            case 21512:
              {
                if (!stream.tty) return -59;
                return 0;
              }

            case 21506:
            case 21507:
            case 21508:
              {
                if (!stream.tty) return -59;
                if (stream.tty.ops.ioctl_tcsets) {
                  var argp = syscallGetVarargP();
                  var c_iflag = HEAP32[((argp) / 4)];
                  var c_oflag = HEAP32[(((argp) + (4)) / 4)];
                  var c_cflag = HEAP32[(((argp) + (8)) / 4)];
                  var c_lflag = HEAP32[(((argp) + (12)) / 4)];
                  var c_cc = [];
                  for (var i = 0; i < 32; i++) {
                    c_cc.push(HEAP8[(argp + i) + (17)]);
                  }
                  return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
                    c_iflag: c_iflag,
                    c_oflag: c_oflag,
                    c_cflag: c_cflag,
                    c_lflag: c_lflag,
                    c_cc: c_cc
                  });
                }
                return 0;
              }

            case 21519:
              {
                if (!stream.tty) return -59;
                var argp = syscallGetVarargP();
                HEAP32[((argp) / 4)] = 0;
                return 0;
              }

            case 21520:
              {
                if (!stream.tty) return -59;
                return -28;
              }

            case 21531:
              {
                var argp = syscallGetVarargP();
                return FS.ioctl(stream, op, argp);
              }

            case 21523:
              {
                if (!stream.tty) return -59;
                if (stream.tty.ops.ioctl_tiocgwinsz) {
                  var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
                  var argp = syscallGetVarargP();
                  HEAP16[((argp) / 2)] = winsize[0];
                  HEAP16[(((argp) + (2)) / 2)] = winsize[1];
                }
                return 0;
              }

            case 21524:
              {
                if (!stream.tty) return -59;
                return 0;
              }

            case 21515:
              {
                if (!stream.tty) return -59;
                return 0;
              }

            default:
              return -28;
          }
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_lstat64(path, buf) {
        path = bigintToI53Checked(path);
        buf = bigintToI53Checked(buf);
        try {
          path = SYSCALLS.getStr(path);
          return SYSCALLS.doStat(FS.lstat, path, buf);
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_mkdirat(dirfd, path, mode) {
        path = bigintToI53Checked(path);
        try {
          path = SYSCALLS.getStr(path);
          path = SYSCALLS.calculateAt(dirfd, path);
          path = PATH.normalize(path);
          if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
          FS.mkdir(path, mode, 0);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_newfstatat(dirfd, path, buf, flags) {
        path = bigintToI53Checked(path);
        buf = bigintToI53Checked(buf);
        try {
          path = SYSCALLS.getStr(path);
          var nofollow = flags & 256;
          var allowEmpty = flags & 4096;
          flags = flags & (~6400);
          assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
          path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
          return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_openat(dirfd, path, flags, varargs) {
        path = bigintToI53Checked(path);
        varargs = bigintToI53Checked(varargs);
        SYSCALLS.varargs = varargs;
        try {
          path = SYSCALLS.getStr(path);
          path = SYSCALLS.calculateAt(dirfd, path);
          var mode = varargs ? syscallGetVarargI() : 0;
          return FS.open(path, flags, mode).fd;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
        path = bigintToI53Checked(path);
        buf = bigintToI53Checked(buf);
        bufsize = bigintToI53Checked(bufsize);
        try {
          path = SYSCALLS.getStr(path);
          path = SYSCALLS.calculateAt(dirfd, path);
          if (bufsize <= 0) return -28;
          var ret = FS.readlink(path);
          var len = Math.min(bufsize, lengthBytesUTF8(ret));
          var endChar = HEAP8[buf + len];
          stringToUTF8(ret, buf, bufsize + 1);
          HEAP8[buf + len] = endChar;
          return len;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
        oldpath = bigintToI53Checked(oldpath);
        newpath = bigintToI53Checked(newpath);
        try {
          oldpath = SYSCALLS.getStr(oldpath);
          newpath = SYSCALLS.getStr(newpath);
          oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
          newpath = SYSCALLS.calculateAt(newdirfd, newpath);
          FS.rename(oldpath, newpath);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_rmdir(path) {
        path = bigintToI53Checked(path);
        try {
          path = SYSCALLS.getStr(path);
          FS.rmdir(path);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_stat64(path, buf) {
        path = bigintToI53Checked(path);
        buf = bigintToI53Checked(buf);
        try {
          path = SYSCALLS.getStr(path);
          return SYSCALLS.doStat(FS.stat, path, buf);
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      function ___syscall_unlinkat(dirfd, path, flags) {
        path = bigintToI53Checked(path);
        try {
          path = SYSCALLS.getStr(path);
          path = SYSCALLS.calculateAt(dirfd, path);
          if (flags === 0) {
            FS.unlink(path);
          } else if (flags === 512) {
            FS.rmdir(path);
          } else {
            abort("Invalid flags passed to unlinkat");
          }
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      var readI53FromI64 = ptr => HEAPU32[((ptr) / 4)] + HEAP32[(((ptr) + (4)) / 4)] * 4294967296;

      function ___syscall_utimensat(dirfd, path, times, flags) {
        path = bigintToI53Checked(path);
        times = bigintToI53Checked(times);
        try {
          path = SYSCALLS.getStr(path);
          assert(flags === 0);
          path = SYSCALLS.calculateAt(dirfd, path, true);
          if (!times) {
            var atime = Date.now();
            var mtime = atime;
          } else {
            var seconds = readI53FromI64(times);
            var nanoseconds = HEAP32[(((times) + (8)) / 4)];
            atime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
            times += 16;
            seconds = readI53FromI64(times);
            nanoseconds = HEAP32[(((times) + (8)) / 4)];
            mtime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
          }
          FS.utime(path, atime, mtime);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      var __abort_js = () => {
        abort("native code called abort()");
      };

      var nowIsMonotonic = 1;

      var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;

      function __emscripten_memcpy_js(dest, src, num) {
        dest = bigintToI53Checked(dest);
        src = bigintToI53Checked(src);
        num = bigintToI53Checked(num);
        return HEAPU8.copyWithin(dest, src, src + num);
      }

      function __emscripten_system(command) {
        command = bigintToI53Checked(command);
        if (false) {
          if (!command) return 1;
          var cmdstr = UTF8ToString(command);
          if (!cmdstr.length) return 0;
          var cp = require("child_process");
          var ret = cp.spawnSync(cmdstr, [], {
            shell: true,
            stdio: "inherit"
          });
          var _W_EXITCODE = (ret, sig) => ((ret) << 8 | (sig));
          if (ret.status === null) {
            var signalToNumber = sig => {
              switch (sig) {
                case "SIGHUP":
                  return 1;

                case "SIGINT":
                  return 2;

                case "SIGQUIT":
                  return 3;

                case "SIGFPE":
                  return 8;

                case "SIGKILL":
                  return 9;

                case "SIGALRM":
                  return 14;

                case "SIGTERM":
                  return 15;
              }
              return 2;
            };
            return _W_EXITCODE(0, signalToNumber(ret.signal));
          }
          return _W_EXITCODE(ret.status, 0);
        }
        if (!command) return 0;
        return -52;
      }

      var __emscripten_throw_longjmp = () => {
        throw Infinity;
      };

      function __gmtime_js(time, tmPtr) {
        time = bigintToI53Checked(time);
        tmPtr = bigintToI53Checked(tmPtr);
        var date = new Date(time * 1e3);
        HEAP32[((tmPtr) / 4)] = date.getUTCSeconds();
        HEAP32[(((tmPtr) + (4)) / 4)] = date.getUTCMinutes();
        HEAP32[(((tmPtr) + (8)) / 4)] = date.getUTCHours();
        HEAP32[(((tmPtr) + (12)) / 4)] = date.getUTCDate();
        HEAP32[(((tmPtr) + (16)) / 4)] = date.getUTCMonth();
        HEAP32[(((tmPtr) + (20)) / 4)] = date.getUTCFullYear() - 1900;
        HEAP32[(((tmPtr) + (24)) / 4)] = date.getUTCDay();
        var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
        var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
        HEAP32[(((tmPtr) + (28)) / 4)] = yday;
      }

      var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

      var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

      var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

      var ydayFromDate = date => {
        var leap = isLeapYear(date.getFullYear());
        var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
        var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
        return yday;
      };

      function __localtime_js(time, tmPtr) {
        time = bigintToI53Checked(time);
        tmPtr = bigintToI53Checked(tmPtr);
        var date = new Date(time * 1e3);
        HEAP32[((tmPtr) / 4)] = date.getSeconds();
        HEAP32[(((tmPtr) + (4)) / 4)] = date.getMinutes();
        HEAP32[(((tmPtr) + (8)) / 4)] = date.getHours();
        HEAP32[(((tmPtr) + (12)) / 4)] = date.getDate();
        HEAP32[(((tmPtr) + (16)) / 4)] = date.getMonth();
        HEAP32[(((tmPtr) + (20)) / 4)] = date.getFullYear() - 1900;
        HEAP32[(((tmPtr) + (24)) / 4)] = date.getDay();
        var yday = ydayFromDate(date) | 0;
        HEAP32[(((tmPtr) + (28)) / 4)] = yday;
        HEAP64[(((tmPtr) + (40)) / 8)] = BigInt(-(date.getTimezoneOffset() * 60));
        var start = new Date(date.getFullYear(), 0, 1);
        var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
        var winterOffset = start.getTimezoneOffset();
        var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
        HEAP32[(((tmPtr) + (32)) / 4)] = dst;
      }

      var __mktime_js = function (tmPtr) {
        tmPtr = bigintToI53Checked(tmPtr);
        var ret = (() => {
          var date = new Date(HEAP32[(((tmPtr) + (20)) / 4)] + 1900, HEAP32[(((tmPtr) + (16)) / 4)], HEAP32[(((tmPtr) + (12)) / 4)], HEAP32[(((tmPtr) + (8)) / 4)], HEAP32[(((tmPtr) + (4)) / 4)], HEAP32[((tmPtr) / 4)], 0);
          var dst = HEAP32[(((tmPtr) + (32)) / 4)];
          var guessedOffset = date.getTimezoneOffset();
          var start = new Date(date.getFullYear(), 0, 1);
          var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
          var winterOffset = start.getTimezoneOffset();
          var dstOffset = Math.min(winterOffset, summerOffset);
          if (dst < 0) {
            HEAP32[(((tmPtr) + (32)) / 4)] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
          } else if ((dst > 0) != (dstOffset == guessedOffset)) {
            var nonDstOffset = Math.max(winterOffset, summerOffset);
            var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
            date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
          }
          HEAP32[(((tmPtr) + (24)) / 4)] = date.getDay();
          var yday = ydayFromDate(date) | 0;
          HEAP32[(((tmPtr) + (28)) / 4)] = yday;
          HEAP32[((tmPtr) / 4)] = date.getSeconds();
          HEAP32[(((tmPtr) + (4)) / 4)] = date.getMinutes();
          HEAP32[(((tmPtr) + (8)) / 4)] = date.getHours();
          HEAP32[(((tmPtr) + (12)) / 4)] = date.getDate();
          HEAP32[(((tmPtr) + (16)) / 4)] = date.getMonth();
          HEAP32[(((tmPtr) + (20)) / 4)] = date.getYear();
          var timeMs = date.getTime();
          if (isNaN(timeMs)) {
            return -1;
          }
          return timeMs / 1e3;
        })();
        return BigInt(ret);
      };

      function __munmap_js(addr, len, prot, flags, fd, offset) {
        addr = bigintToI53Checked(addr);
        len = bigintToI53Checked(len);
        offset = bigintToI53Checked(offset);
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          if (prot & 2) {
            SYSCALLS.doMsync(addr, stream, len, flags, offset);
          }
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return -e.errno;
        }
      }

      var __tzset_js = function (timezone, daylight, std_name, dst_name) {
        timezone = bigintToI53Checked(timezone);
        daylight = bigintToI53Checked(daylight);
        std_name = bigintToI53Checked(std_name);
        dst_name = bigintToI53Checked(dst_name);
        var currentYear = (new Date).getFullYear();
        var winter = new Date(currentYear, 0, 1);
        var summer = new Date(currentYear, 6, 1);
        var winterOffset = winter.getTimezoneOffset();
        var summerOffset = summer.getTimezoneOffset();
        var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
        HEAPU64[((timezone) / 8)] = BigInt(stdTimezoneOffset * 60);
        HEAP32[((daylight) / 4)] = Number(winterOffset != summerOffset);
        var extractZone = date => date.toLocaleTimeString(undefined, {
          hour12: false,
          timeZoneName: "short"
        }).split(" ")[1];
        var winterName = extractZone(winter);
        var summerName = extractZone(summer);
        assert(winterName);
        assert(summerName);
        assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
        assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
        if (summerOffset < winterOffset) {
          stringToUTF8(winterName, std_name, 17);
          stringToUTF8(summerName, dst_name, 17);
        } else {
          stringToUTF8(winterName, dst_name, 17);
          stringToUTF8(summerName, std_name, 17);
        }
      };

      var _emscripten_date_now = () => Date.now();

      function _emscripten_err(str) {
        str = bigintToI53Checked(str);
        return err(UTF8ToString(str));
      }

      var getHeapMax = () => 17179869184;

      var _emscripten_get_heap_max = () => BigInt(getHeapMax());

      var _emscripten_get_now;

      _emscripten_get_now = () => deterministicNow();

      var growMemory = size => {
        var b = wasmMemory.buffer;
        var pages = (size - b.byteLength + 65535) / 65536;
        try {
          wasmMemory.grow(pages);
          updateMemoryViews();
          return 1;
        } /*success*/ catch (e) {
          err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
        }
      };

      function _emscripten_resize_heap(requestedSize) {
        requestedSize = bigintToI53Checked(requestedSize);
        var oldSize = HEAPU8.length;
        assert(requestedSize > oldSize);
        var maxHeapSize = getHeapMax();
        if (requestedSize > maxHeapSize) {
          err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
          return false;
        }
        var alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
        for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
          var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
          overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
          var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
          var replacement = growMemory(newSize);
          if (replacement) {
            return true;
          }
        }
        err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
        return false;
      }

      var ENV = {};

      var getExecutableName = () => thisProgram || "./this.program";

      var getEnvStrings = () => {
        if (!getEnvStrings.strings) {
          var lang = "C.UTF-8";
          var env = {
            "USER": "web_user",
            "LOGNAME": "web_user",
            "PATH": "/",
            "PWD": "/",
            "HOME": "/home/web_user",
            "LANG": lang,
            "_": getExecutableName()
          };
          for (var x in ENV) {
            if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
          }
          var strings = [];
          for (var x in env) {
            strings.push(`${x}=${env[x]}`);
          }
          getEnvStrings.strings = strings;
        }
        return getEnvStrings.strings;
      };

      var stringToAscii = (str, buffer) => {
        for (var i = 0; i < str.length; ++i) {
          assert(str.charCodeAt(i) === (str.charCodeAt(i) & 255));
          HEAP8[buffer++] = str.charCodeAt(i);
        }
        HEAP8[buffer] = 0;
      };

      var _environ_get = function (__environ, environ_buf) {
        __environ = bigintToI53Checked(__environ);
        environ_buf = bigintToI53Checked(environ_buf);
        var bufSize = 0;
        getEnvStrings().forEach((string, i) => {
          var ptr = environ_buf + bufSize;
          HEAPU64[(((__environ) + (i * 8)) / 8)] = BigInt(ptr);
          stringToAscii(string, ptr);
          bufSize += string.length + 1;
        });
        return 0;
      };

      var _environ_sizes_get = function (penviron_count, penviron_buf_size) {
        penviron_count = bigintToI53Checked(penviron_count);
        penviron_buf_size = bigintToI53Checked(penviron_buf_size);
        var strings = getEnvStrings();
        HEAPU64[((penviron_count) / 8)] = BigInt(strings.length);
        var bufSize = 0;
        strings.forEach(string => bufSize += string.length + 1);
        HEAPU64[((penviron_buf_size) / 8)] = BigInt(bufSize);
        return 0;
      };

      var runtimeKeepaliveCounter = 0;

      var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

      var _proc_exit = code => {
        EXITSTATUS = code;
        if (!keepRuntimeAlive()) {
          Module["onExit"]?.(code);
          ABORT = true;
        }
        quit_(code, new ExitStatus(code));
      };

/** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
        EXITSTATUS = status;
        checkUnflushedContent();
        if (keepRuntimeAlive() && !implicit) {
          var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
          readyPromiseReject(msg);
          err(msg);
        }
        _proc_exit(status);
      };

      var _exit = exitJS;

      function _fd_close(fd) {
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          FS.close(stream);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return e.errno;
        }
      }

      function _fd_fdstat_get(fd, pbuf) {
        pbuf = bigintToI53Checked(pbuf);
        try {
          var rightsBase = 0;
          var rightsInheriting = 0;
          var flags = 0;
          {
            var stream = SYSCALLS.getStreamFromFD(fd);
            var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
          }
          HEAP8[pbuf] = type;
          HEAP16[(((pbuf) + (2)) / 2)] = flags;
          HEAP64[(((pbuf) + (8)) / 8)] = BigInt(rightsBase);
          HEAP64[(((pbuf) + (16)) / 8)] = BigInt(rightsInheriting);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return e.errno;
        }
      }

/** @param {number=} offset */ var doReadv = (stream, iov, iovcnt, offset) => {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = Number(HEAPU64[((iov) / 8)]);
          var len = Number(HEAPU64[(((iov) + (8)) / 8)]);
          iov += 16;
          var curr = FS.read(stream, HEAP8, ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break;
          if (typeof offset != "undefined") {
            offset += curr;
          }
        }
        return ret;
      };

      function _fd_read(fd, iov, iovcnt, pnum) {
        iov = bigintToI53Checked(iov);
        iovcnt = bigintToI53Checked(iovcnt);
        pnum = bigintToI53Checked(pnum);
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          var num = doReadv(stream, iov, iovcnt);
          HEAPU64[((pnum) / 8)] = BigInt(num);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return e.errno;
        }
      }

      function _fd_seek(fd, offset, whence, newOffset) {
        offset = bigintToI53Checked(offset);
        newOffset = bigintToI53Checked(newOffset);
        try {
          if (isNaN(offset)) return 61;
          var stream = SYSCALLS.getStreamFromFD(fd);
          FS.llseek(stream, offset, whence);
          HEAP64[((newOffset) / 8)] = BigInt(stream.position);
          if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return e.errno;
        }
      }

      var _fd_sync = function (fd) {
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          return Asyncify.handleSleep(wakeUp => {
            var mount = stream.node.mount;
            if (!mount.type.syncfs) {
              wakeUp(0);
              return;
            }
            mount.type.syncfs(mount, false, err => {
              if (err) {
                wakeUp(29);
                return;
              }
              wakeUp(0);
            });
          });
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return e.errno;
        }
      };

      _fd_sync.isAsync = true;

/** @param {number=} offset */ var doWritev = (stream, iov, iovcnt, offset) => {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = Number(HEAPU64[((iov) / 8)]);
          var len = Number(HEAPU64[(((iov) + (8)) / 8)]);
          iov += 16;
          var curr = FS.write(stream, HEAP8, ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (typeof offset != "undefined") {
            offset += curr;
          }
        }
        return ret;
      };

      function _fd_write(fd, iov, iovcnt, pnum) {
        iov = bigintToI53Checked(iov);
        iovcnt = bigintToI53Checked(iovcnt);
        pnum = bigintToI53Checked(pnum);
        try {
          var stream = SYSCALLS.getStreamFromFD(fd);
          var num = doWritev(stream, iov, iovcnt);
          HEAPU64[((pnum) / 8)] = BigInt(num);
          return 0;
        } catch (e) {
          if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
          return e.errno;
        }
      }

      var arraySum = (array, index) => {
        var sum = 0;
        for (var i = 0; i <= index; sum += array[i++]) { }
        return sum;
      };

      var MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      var MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

      var addDays = (date, days) => {
        var newDate = new Date(date.getTime());
        while (days > 0) {
          var leap = isLeapYear(newDate.getFullYear());
          var currentMonth = newDate.getMonth();
          var daysInCurrentMonth = (leap ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR)[currentMonth];
          if (days > daysInCurrentMonth - newDate.getDate()) {
            days -= (daysInCurrentMonth - newDate.getDate() + 1);
            newDate.setDate(1);
            if (currentMonth < 11) {
              newDate.setMonth(currentMonth + 1);
            } else {
              newDate.setMonth(0);
              newDate.setFullYear(newDate.getFullYear() + 1);
            }
          } else {
            newDate.setDate(newDate.getDate() + days);
            return newDate;
          }
        }
        return newDate;
      };

      var writeArrayToMemory = (array, buffer) => {
        assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
        HEAP8.set(array, buffer);
      };

      var _strftime = function (s, maxsize, format, tm) {
        s = bigintToI53Checked(s);
        maxsize = bigintToI53Checked(maxsize);
        format = bigintToI53Checked(format);
        tm = bigintToI53Checked(tm);
        var ret = (() => {
          var tm_zone = Number(HEAPU64[(((tm) + (48)) / 8)]);
          var date = {
            tm_sec: HEAP32[((tm) / 4)],
            tm_min: HEAP32[(((tm) + (4)) / 4)],
            tm_hour: HEAP32[(((tm) + (8)) / 4)],
            tm_mday: HEAP32[(((tm) + (12)) / 4)],
            tm_mon: HEAP32[(((tm) + (16)) / 4)],
            tm_year: HEAP32[(((tm) + (20)) / 4)],
            tm_wday: HEAP32[(((tm) + (24)) / 4)],
            tm_yday: HEAP32[(((tm) + (28)) / 4)],
            tm_isdst: HEAP32[(((tm) + (32)) / 4)],
            tm_gmtoff: HEAP64[(((tm) + (40)) / 8)],
            tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
          };
          date.tm_gmtoff = Number(date.tm_gmtoff);
          var pattern = UTF8ToString(format);
          var EXPANSION_RULES_1 = {
            "%c": "%a %b %d %H:%M:%S %Y",
            "%D": "%m/%d/%y",
            "%F": "%Y-%m-%d",
            "%h": "%b",
            "%r": "%I:%M:%S %p",
            "%R": "%H:%M",
            "%T": "%H:%M:%S",
            "%x": "%m/%d/%y",
            "%X": "%H:%M:%S",
            "%Ec": "%c",
            "%EC": "%C",
            "%Ex": "%m/%d/%y",
            "%EX": "%H:%M:%S",
            "%Ey": "%y",
            "%EY": "%Y",
            "%Od": "%d",
            "%Oe": "%e",
            "%OH": "%H",
            "%OI": "%I",
            "%Om": "%m",
            "%OM": "%M",
            "%OS": "%S",
            "%Ou": "%u",
            "%OU": "%U",
            "%OV": "%V",
            "%Ow": "%w",
            "%OW": "%W",
            "%Oy": "%y"
          };
          for (var rule in EXPANSION_RULES_1) {
            pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
          }
          var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          function leadingSomething(value, digits, character) {
            var str = typeof value == "number" ? value.toString() : (value || "");
            while (str.length < digits) {
              str = character[0] + str;
            }
            return str;
          }
          function leadingNulls(value, digits) {
            return leadingSomething(value, digits, "0");
          }
          function compareByDay(date1, date2) {
            function sgn(value) {
              return value < 0 ? -1 : (value > 0 ? 1 : 0);
            }
            var compare;
            if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
              if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                compare = sgn(date1.getDate() - date2.getDate());
              }
            }
            return compare;
          }
          function getFirstWeekStartDate(janFourth) {
            switch (janFourth.getDay()) {
              case 0:
                return new Date(janFourth.getFullYear() - 1, 11, 29);

              case 1:
                return janFourth;

              case 2:
                return new Date(janFourth.getFullYear(), 0, 3);

              case 3:
                return new Date(janFourth.getFullYear(), 0, 2);

              case 4:
                return new Date(janFourth.getFullYear(), 0, 1);

              case 5:
                return new Date(janFourth.getFullYear() - 1, 11, 31);

              case 6:
                return new Date(janFourth.getFullYear() - 1, 11, 30);
            }
          }
          function getWeekBasedYear(date) {
            var thisDate = addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
            var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
            var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
            var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
            var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
            if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
              if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                return thisDate.getFullYear() + 1;
              }
              return thisDate.getFullYear();
            }
            return thisDate.getFullYear() - 1;
          }
          var EXPANSION_RULES_2 = {
            "%a": date => WEEKDAYS[date.tm_wday].substring(0, 3),
            "%A": date => WEEKDAYS[date.tm_wday],
            "%b": date => MONTHS[date.tm_mon].substring(0, 3),
            "%B": date => MONTHS[date.tm_mon],
            "%C": date => {
              var year = date.tm_year + 1900;
              return leadingNulls((year / 100) | 0, 2);
            },
            "%d": date => leadingNulls(date.tm_mday, 2),
            "%e": date => leadingSomething(date.tm_mday, 2, " "),
            "%g": date => getWeekBasedYear(date).toString().substring(2),
            "%G": getWeekBasedYear,
            "%H": date => leadingNulls(date.tm_hour, 2),
            "%I": date => {
              var twelveHour = date.tm_hour;
              if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
              return leadingNulls(twelveHour, 2);
            },
            "%j": date => leadingNulls(date.tm_mday + arraySum(isLeapYear(date.tm_year + 1900) ? MONTH_DAYS_LEAP : MONTH_DAYS_REGULAR, date.tm_mon - 1), 3),
            "%m": date => leadingNulls(date.tm_mon + 1, 2),
            "%M": date => leadingNulls(date.tm_min, 2),
            "%n": () => "\n",
            "%p": date => {
              if (date.tm_hour >= 0 && date.tm_hour < 12) {
                return "AM";
              }
              return "PM";
            },
            "%S": date => leadingNulls(date.tm_sec, 2),
            "%t": () => "\t",
            "%u": date => date.tm_wday || 7,
            "%U": date => {
              var days = date.tm_yday + 7 - date.tm_wday;
              return leadingNulls(Math.floor(days / 7), 2);
            },
            "%V": date => {
              var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7) / 7);
              if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
                val++;
              }
              if (!val) {
                val = 52;
                var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
                if (dec31 == 4 || (dec31 == 5 && isLeapYear(date.tm_year % 400 - 1))) {
                  val++;
                }
              } else if (val == 53) {
                var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
                if (jan1 != 4 && (jan1 != 3 || !isLeapYear(date.tm_year))) val = 1;
              }
              return leadingNulls(val, 2);
            },
            "%w": date => date.tm_wday,
            "%W": date => {
              var days = date.tm_yday + 7 - ((date.tm_wday + 6) % 7);
              return leadingNulls(Math.floor(days / 7), 2);
            },
            "%y": date => (date.tm_year + 1900).toString().substring(2),
            "%Y": date => date.tm_year + 1900,
            "%z": date => {
              var off = date.tm_gmtoff;
              var ahead = off >= 0;
              off = Math.abs(off) / 60;
              off = (off / 60) * 100 + (off % 60);
              return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
            },
            "%Z": date => date.tm_zone,
            "%%": () => "%"
          };
          pattern = pattern.replace(/%%/g, "\0\0");
          for (var rule in EXPANSION_RULES_2) {
            if (pattern.includes(rule)) {
              pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
            }
          }
          pattern = pattern.replace(/\0\0/g, "%");
          var bytes = intArrayFromString(pattern, false);
          if (bytes.length > maxsize) {
            return 0;
          }
          writeArrayToMemory(bytes, s);
          return bytes.length - 1;
        })();
        return BigInt(ret);
      };

      var _strftime_l = function (s, maxsize, format, tm, loc) {
        s = bigintToI53Checked(s);
        maxsize = bigintToI53Checked(maxsize);
        format = bigintToI53Checked(format);
        tm = bigintToI53Checked(tm);
        loc = bigintToI53Checked(loc);
        var ret = (() => _strftime(s, maxsize, format, tm))();
        return BigInt(ret);
      };

      var wasmTableMirror = [];

/** @type {WebAssembly.Table} */ var wasmTable;

      var runAndAbortIfError = func => {
        try {
          return func();
        } catch (e) {
          abort(e);
        }
      };

      var handleException = e => {
        if (e instanceof ExitStatus || e == "unwind") {
          return EXITSTATUS;
        }
        checkStackCookie();
        if (e instanceof WebAssembly.RuntimeError) {
          if (_emscripten_stack_get_current() <= 0) {
            err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 41943040)");
          }
        }
        quit_(1, e);
      };

      var maybeExit = () => {
        if (!keepRuntimeAlive()) {
          try {
            _exit(EXITSTATUS);
          } catch (e) {
            handleException(e);
          }
        }
      };

      var callUserCallback = func => {
        if (ABORT) {
          err("user callback triggered after runtime exited or application aborted.  Ignoring.");
          return;
        }
        try {
          func();
          maybeExit();
        } catch (e) {
          handleException(e);
        }
      };

      var runtimeKeepalivePush = () => {
        runtimeKeepaliveCounter += 1;
      };

      var runtimeKeepalivePop = () => {
        assert(runtimeKeepaliveCounter > 0);
        runtimeKeepaliveCounter -= 1;
      };

      var Asyncify = {
        rewindArguments: {},
        instrumentWasmImports(imports) {
          var importPattern = /^(invoke_.*|__asyncjs__.*)$/;
          for (let [x, original] of Object.entries(imports)) {
            if (typeof original == "function") {
              let isAsyncifyImport = original.isAsync || importPattern.test(x);
              imports[x] = (...args) => {
                var originalAsyncifyState = Asyncify.state;
                try {
                  return original(...args);
                } finally {
                  var changedToDisabled = originalAsyncifyState === Asyncify.State.Normal && Asyncify.state === Asyncify.State.Disabled;
                  var ignoredInvoke = x.startsWith("invoke_") && true;
                  if (Asyncify.state !== originalAsyncifyState && !isAsyncifyImport && !changedToDisabled && !ignoredInvoke) {
                    throw new Error(`import ${x} was not in ASYNCIFY_IMPORTS, but changed the state`);
                  }
                }
              };
            }
          }
        },
        saveOrRestoreRewindArguments(funcName, passedArguments) {
          if (passedArguments.length === 0) {
            return Asyncify.rewindArguments[funcName] || [];
          }
          return Asyncify.rewindArguments[funcName] = Array.from(passedArguments);
        },
        instrumentWasmExports(exports) {
          var ret = {};
          for (let [x, original] of Object.entries(exports)) {
            if (typeof original == "function") {
              ret[x] = (...args) => {
                Asyncify.exportCallStack.push(x);
                try {
                  return original(...Asyncify.saveOrRestoreRewindArguments(x, args));
                } finally {
                  if (!ABORT) {
                    var y = Asyncify.exportCallStack.pop();
                    assert(y === x);
                    Asyncify.maybeStopUnwind();
                  }
                }
              };
            } else {
              ret[x] = original;
            }
          }
          return ret;
        },
        State: {
          Normal: 0,
          Unwinding: 1,
          Rewinding: 2,
          Disabled: 3
        },
        state: 0,
        StackSize: 41943040,
        currData: null,
        handleSleepReturnValue: 0,
        exportCallStack: [],
        callStackNameToId: {},
        callStackIdToName: {},
        callStackId: 0,
        asyncPromiseHandlers: null,
        sleepCallbacks: [],
        getCallStackId(funcName) {
          var id = Asyncify.callStackNameToId[funcName];
          if (id === undefined) {
            id = Asyncify.callStackId++;
            Asyncify.callStackNameToId[funcName] = id;
            Asyncify.callStackIdToName[id] = funcName;
          }
          return id;
        },
        maybeStopUnwind() {
          if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && Asyncify.exportCallStack.length === 0) {
            Asyncify.state = Asyncify.State.Normal;
            runAndAbortIfError(_asyncify_stop_unwind);
            if (typeof Fibers != "undefined") {
              Fibers.trampoline();
            }
          }
        },
        whenDone() {
          assert(Asyncify.currData, "Tried to wait for an async operation when none is in progress.");
          assert(!Asyncify.asyncPromiseHandlers, "Cannot have multiple async operations in flight at once");
          return new Promise((resolve, reject) => {
            Asyncify.asyncPromiseHandlers = {
              resolve: resolve,
              reject: reject
            };
          });
        },
        allocateData() {
          var ptr = _malloc(24 + Asyncify.StackSize);
          Asyncify.setDataHeader(ptr, ptr + 24, Asyncify.StackSize);
          Asyncify.setDataRewindFunc(ptr);
          return ptr;
        },
        setDataHeader(ptr, stack, stackSize) {
          HEAPU64[((ptr) / 8)] = BigInt(stack);
          HEAPU64[(((ptr) + (8)) / 8)] = BigInt(stack + stackSize);
        },
        setDataRewindFunc(ptr) {
          var bottomOfCallStack = Asyncify.exportCallStack[0];
          var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
          HEAP32[(((ptr) + (16)) / 4)] = rewindId;
        },
        getDataRewindFunc(ptr) {
          var id = HEAP32[(((ptr) + (16)) / 4)];
          var name = Asyncify.callStackIdToName[id];
          var func = wasmExports[name];
          return func;
        },
        doRewind(ptr) {
          var start = Asyncify.getDataRewindFunc(ptr);
          return start();
        },
        handleSleep(startAsync) {
          assert(Asyncify.state !== Asyncify.State.Disabled, "Asyncify cannot be done during or after the runtime exits");
          if (ABORT) return;
          if (Asyncify.state === Asyncify.State.Normal) {
            var reachedCallback = false;
            var reachedAfterCallback = false;
            startAsync((handleSleepReturnValue = 0) => {
              assert(!handleSleepReturnValue || typeof handleSleepReturnValue == "number" || typeof handleSleepReturnValue == "boolean");
              if (ABORT) return;
              Asyncify.handleSleepReturnValue = handleSleepReturnValue;
              reachedCallback = true;
              if (!reachedAfterCallback) {
                return;
              }
              assert(!Asyncify.exportCallStack.length, "Waking up (starting to rewind) must be done from JS, without compiled code on the stack.");
              Asyncify.state = Asyncify.State.Rewinding;
              runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
              if (typeof Browser != "undefined" && Browser.mainLoop.func) {
                Browser.mainLoop.resume();
              }
              var asyncWasmReturnValue, isError = false;
              try {
                asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
              } catch (err) {
                asyncWasmReturnValue = err;
                isError = true;
              }
              var handled = false;
              if (!Asyncify.currData) {
                var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
                if (asyncPromiseHandlers) {
                  Asyncify.asyncPromiseHandlers = null;
                  (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
                  handled = true;
                }
              }
              if (isError && !handled) {
                throw asyncWasmReturnValue;
              }
            });
            reachedAfterCallback = true;
            if (!reachedCallback) {
              Asyncify.state = Asyncify.State.Unwinding;
              Asyncify.currData = Asyncify.allocateData();
              if (typeof Browser != "undefined" && Browser.mainLoop.func) {
                Browser.mainLoop.pause();
              }
              runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
            }
          } else if (Asyncify.state === Asyncify.State.Rewinding) {
            Asyncify.state = Asyncify.State.Normal;
            runAndAbortIfError(_asyncify_stop_rewind);
            _free(Asyncify.currData);
            Asyncify.currData = null;
            Asyncify.sleepCallbacks.forEach(callUserCallback);
          } else {
            abort(`invalid state: ${Asyncify.state}`);
          }
          return Asyncify.handleSleepReturnValue;
        },
        handleAsync(startAsync) {
          return Asyncify.handleSleep(wakeUp => {
            startAsync().then(wakeUp);
          });
        }
      };

      var getCFunc = ident => {
        var func = Module["_" + ident];
        assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
        return func;
      };

      var stackAlloc = sz => __emscripten_stack_alloc(sz);

      var stringToUTF8OnStack = str => {
        var size = lengthBytesUTF8(str) + 1;
        var ret = stackAlloc(size);
        stringToUTF8(str, ret, size);
        return ret;
      };

/**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */ var ccall = (ident, returnType, argTypes, args, opts) => {
        var toC = {
          "pointer": p => BigInt(p),
          "string": str => {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
              ret = stringToUTF8OnStack(str);
            }
            return BigInt(ret);
          },
          "array": arr => {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return BigInt(ret);
          }
        };
        function convertReturnValue(ret) {
          if (returnType === "string") {
            ret = Number(ret);
            return UTF8ToString(ret);
          }
          if (returnType === "pointer") return Number(ret);
          if (returnType === "boolean") return Boolean(ret);
          return ret;
        }
        var func = getCFunc(ident);
        var cArgs = [];
        var stack = 0;
        assert(returnType !== "array", 'Return type should not be "array".');
        if (args) {
          for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
              if (stack === 0) stack = stackSave();
              cArgs[i] = converter(args[i]);
            } else {
              cArgs[i] = args[i];
            }
          }
        }
        var previousAsync = Asyncify.currData;
        var ret = func(...cArgs);
        function onDone(ret) {
          runtimeKeepalivePop();
          if (stack !== 0) stackRestore(stack);
          return convertReturnValue(ret);
        }
        var asyncMode = opts?.async;
        runtimeKeepalivePush();
        if (Asyncify.currData != previousAsync) {
          assert(!(previousAsync && Asyncify.currData), "We cannot start an async operation when one is already flight");
          assert(!(previousAsync && !Asyncify.currData), "We cannot stop an async operation in flight");
          assert(asyncMode, "The call to " + ident + " is running asynchronously. If this was intended, add the async option to the ccall/cwrap call.");
          return Asyncify.whenDone().then(onDone);
        }
        ret = onDone(ret);
        if (asyncMode) return Promise.resolve(ret);
        return ret;
      };

/**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */ var cwrap = (ident, returnType, argTypes, opts) => (...args) => ccall(ident, returnType, argTypes, args, opts);

      FS.createPreloadedFile = FS_createPreloadedFile;

      FS.staticInit();

      Module["FS_createPath"] = FS.createPath;

      Module["FS_createDataFile"] = FS.createDataFile;

      Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

      Module["FS_unlink"] = FS.unlink;

      Module["FS_createLazyFile"] = FS.createLazyFile;

      Module["FS_createDevice"] = FS.createDevice;

      function checkIncomingModuleAPI() {
        ignoredModuleProp("fetchSettings");
      }

      var wasmImports = {
 /** @export */ __assert_fail: ___assert_fail,
 /** @export */ __asyncjs__weavedrive_close: __asyncjs__weavedrive_close,


 /** @export */ __asyncjs__weavedrive_open: __asyncjs__weavedrive_open,
 /** @export */ __asyncjs__weavedrive_read: __asyncjs__weavedrive_read,
 /** @export */ __cxa_throw: ___cxa_throw,
 /** @export */ __syscall_chmod: ___syscall_chmod,
 /** @export */ __syscall_dup3: ___syscall_dup3,
 /** @export */ __syscall_faccessat: ___syscall_faccessat,
 /** @export */ __syscall_fchmod: ___syscall_fchmod,
 /** @export */ __syscall_fchown32: ___syscall_fchown32,
 /** @export */ __syscall_fcntl64: ___syscall_fcntl64,
 /** @export */ __syscall_fstat64: ___syscall_fstat64,
 /** @export */ __syscall_ftruncate64: ___syscall_ftruncate64,
 /** @export */ __syscall_getcwd: ___syscall_getcwd,
 /** @export */ __syscall_ioctl: ___syscall_ioctl,
 /** @export */ __syscall_lstat64: ___syscall_lstat64,
 /** @export */ __syscall_mkdirat: ___syscall_mkdirat,
 /** @export */ __syscall_newfstatat: ___syscall_newfstatat,
 /** @export */ __syscall_openat: ___syscall_openat,
 /** @export */ __syscall_readlinkat: ___syscall_readlinkat,
 /** @export */ __syscall_renameat: ___syscall_renameat,
 /** @export */ __syscall_rmdir: ___syscall_rmdir,
 /** @export */ __syscall_stat64: ___syscall_stat64,
 /** @export */ __syscall_unlinkat: ___syscall_unlinkat,
 /** @export */ __syscall_utimensat: ___syscall_utimensat,
 /** @export */ _abort_js: __abort_js,
 /** @export */ _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
 /** @export */ _emscripten_memcpy_js: __emscripten_memcpy_js,
 /** @export */ _emscripten_system: __emscripten_system,
 /** @export */ _emscripten_throw_longjmp: __emscripten_throw_longjmp,
 /** @export */ _gmtime_js: __gmtime_js,
 /** @export */ _localtime_js: __localtime_js,
 /** @export */ _mktime_js: __mktime_js,
 /** @export */ _munmap_js: __munmap_js,
 /** @export */ _tzset_js: __tzset_js,
 /** @export */ emscripten_date_now: _emscripten_date_now,
 /** @export */ emscripten_err: _emscripten_err,
 /** @export */ emscripten_get_heap_max: _emscripten_get_heap_max,
 /** @export */ emscripten_get_now: _emscripten_get_now,
 /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
 /** @export */ environ_get: _environ_get,
 /** @export */ environ_sizes_get: _environ_sizes_get,
 /** @export */ exit: _exit,
 /** @export */ fd_close: _fd_close,
 /** @export */ fd_fdstat_get: _fd_fdstat_get,
 /** @export */ fd_read: _fd_read,
 /** @export */ fd_seek: _fd_seek,
 /** @export */ fd_sync: _fd_sync,
 /** @export */ fd_write: _fd_write,
 /** @export */ invoke_vjj: invoke_vjj,
 /** @export */ strftime: _strftime,
 /** @export */ strftime_l: _strftime_l
      };

      var wasmExports = createWasm();

      var ___wasm_call_ctors = createExportWrapper("__wasm_call_ctors", 0);

      var _malloc = Module["_malloc"] = createExportWrapper("malloc", 1);

      var _handle = Module["_handle"] = createExportWrapper("handle", 2);

      var _main = createExportWrapper("main", 2);

      var _free = createExportWrapper("free", 1);

      var _fflush = createExportWrapper("fflush", 1);

      var _emscripten_builtin_memalign = createExportWrapper("emscripten_builtin_memalign", 2);

      var _sbrk = createExportWrapper("sbrk", 1);

      var _setThrew = createExportWrapper("setThrew", 2);

      var _emscripten_stack_init = () => (_emscripten_stack_init = wasmExports["emscripten_stack_init"])();

      var _emscripten_stack_get_free = () => (_emscripten_stack_get_free = wasmExports["emscripten_stack_get_free"])();

      var _emscripten_stack_get_base = () => (_emscripten_stack_get_base = wasmExports["emscripten_stack_get_base"])();

      var _emscripten_stack_get_end = () => (_emscripten_stack_get_end = wasmExports["emscripten_stack_get_end"])();

      var __emscripten_stack_restore = a0 => (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0);

      var __emscripten_stack_alloc = a0 => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0);

      var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();

      var ___cxa_is_pointer_type = createExportWrapper("__cxa_is_pointer_type", 1);

      var dynCall_ij = Module["dynCall_ij"] = createExportWrapper("dynCall_ij", 2);

      var dynCall_vi = Module["dynCall_vi"] = createExportWrapper("dynCall_vi", 2);

      var dynCall_vjj = Module["dynCall_vjj"] = createExportWrapper("dynCall_vjj", 3);

      var dynCall_jjj = Module["dynCall_jjj"] = createExportWrapper("dynCall_jjj", 3);

      var dynCall_jjjj = Module["dynCall_jjjj"] = createExportWrapper("dynCall_jjjj", 4);

      var dynCall_jjjjj = Module["dynCall_jjjjj"] = createExportWrapper("dynCall_jjjjj", 5);

      var dynCall_ijij = Module["dynCall_ijij"] = createExportWrapper("dynCall_ijij", 4);

      var dynCall_ijjjj = Module["dynCall_ijjjj"] = createExportWrapper("dynCall_ijjjj", 5);

      var dynCall_vjij = Module["dynCall_vjij"] = createExportWrapper("dynCall_vjij", 4);

      var dynCall_vj = Module["dynCall_vj"] = createExportWrapper("dynCall_vj", 2);

      var dynCall_ijijij = Module["dynCall_ijijij"] = createExportWrapper("dynCall_ijijij", 6);

      var dynCall_iji = Module["dynCall_iji"] = createExportWrapper("dynCall_iji", 3);

      var dynCall_vjijjj = Module["dynCall_vjijjj"] = createExportWrapper("dynCall_vjijjj", 6);

      var dynCall_ijijj = Module["dynCall_ijijj"] = createExportWrapper("dynCall_ijijj", 5);

      var dynCall_i = Module["dynCall_i"] = createExportWrapper("dynCall_i", 1);

      var dynCall_ji = Module["dynCall_ji"] = createExportWrapper("dynCall_ji", 2);

      var dynCall_ijjjiji = Module["dynCall_ijjjiji"] = createExportWrapper("dynCall_ijjjiji", 7);

      var dynCall_vjjj = Module["dynCall_vjjj"] = createExportWrapper("dynCall_vjjj", 4);

      var dynCall_ijj = Module["dynCall_ijj"] = createExportWrapper("dynCall_ijj", 3);

      var dynCall_ijiji = Module["dynCall_ijiji"] = createExportWrapper("dynCall_ijiji", 5);

      var dynCall_ijiij = Module["dynCall_ijiij"] = createExportWrapper("dynCall_ijiij", 5);

      var dynCall_ijjji = Module["dynCall_ijjji"] = createExportWrapper("dynCall_ijjji", 5);

      var dynCall_ijjjjj = Module["dynCall_ijjjjj"] = createExportWrapper("dynCall_ijjjjj", 6);

      var dynCall_vjjjij = Module["dynCall_vjjjij"] = createExportWrapper("dynCall_vjjjij", 6);

      var dynCall_iijj = Module["dynCall_iijj"] = createExportWrapper("dynCall_iijj", 4);

      var dynCall_jj = Module["dynCall_jj"] = createExportWrapper("dynCall_jj", 2);

      var dynCall_vjjii = Module["dynCall_vjjii"] = createExportWrapper("dynCall_vjjii", 5);

      var dynCall_ijijiii = Module["dynCall_ijijiii"] = createExportWrapper("dynCall_ijijiii", 7);

      var dynCall_ijjj = Module["dynCall_ijjj"] = createExportWrapper("dynCall_ijjj", 4);

      var dynCall_ijjij = Module["dynCall_ijjij"] = createExportWrapper("dynCall_ijjij", 5);

      var dynCall_vjjji = Module["dynCall_vjjji"] = createExportWrapper("dynCall_vjjji", 5);

      var dynCall_vjjjj = Module["dynCall_vjjjj"] = createExportWrapper("dynCall_vjjjj", 5);

      var dynCall_vjjij = Module["dynCall_vjjij"] = createExportWrapper("dynCall_vjjij", 5);

      var dynCall_ijjjij = Module["dynCall_ijjjij"] = createExportWrapper("dynCall_ijjjij", 6);

      var dynCall_ijji = Module["dynCall_ijji"] = createExportWrapper("dynCall_ijji", 4);

      var dynCall_ijiiij = Module["dynCall_ijiiij"] = createExportWrapper("dynCall_ijiiij", 6);

      var dynCall_ijiii = Module["dynCall_ijiii"] = createExportWrapper("dynCall_ijiii", 5);

      var dynCall_ijii = Module["dynCall_ijii"] = createExportWrapper("dynCall_ijii", 4);

      var dynCall_ii = Module["dynCall_ii"] = createExportWrapper("dynCall_ii", 2);

      var dynCall_iij = Module["dynCall_iij"] = createExportWrapper("dynCall_iij", 3);

      var dynCall_iiij = Module["dynCall_iiij"] = createExportWrapper("dynCall_iiij", 4);

      var dynCall_jijj = Module["dynCall_jijj"] = createExportWrapper("dynCall_jijj", 4);

      var dynCall_iii = Module["dynCall_iii"] = createExportWrapper("dynCall_iii", 3);

      var dynCall_iiii = Module["dynCall_iiii"] = createExportWrapper("dynCall_iiii", 4);

      var dynCall_jjjiiij = Module["dynCall_jjjiiij"] = createExportWrapper("dynCall_jjjiiij", 7);

      var dynCall_ijjijjj = Module["dynCall_ijjijjj"] = createExportWrapper("dynCall_ijjijjj", 7);

      var dynCall_jji = Module["dynCall_jji"] = createExportWrapper("dynCall_jji", 3);

      var dynCall_ijid = Module["dynCall_ijid"] = createExportWrapper("dynCall_ijid", 4);

      var dynCall_dji = Module["dynCall_dji"] = createExportWrapper("dynCall_dji", 3);

      var dynCall_ijjijj = Module["dynCall_ijjijj"] = createExportWrapper("dynCall_ijjijj", 6);

      var dynCall_ijjiijjjj = Module["dynCall_ijjiijjjj"] = createExportWrapper("dynCall_ijjiijjjj", 9);

      var dynCall_ijjjjjj = Module["dynCall_ijjjjjj"] = createExportWrapper("dynCall_ijjjjjj", 7);

      var dynCall_j = Module["dynCall_j"] = createExportWrapper("dynCall_j", 1);

      var dynCall_vjijj = Module["dynCall_vjijj"] = createExportWrapper("dynCall_vjijj", 5);

      var dynCall_vjd = Module["dynCall_vjd"] = createExportWrapper("dynCall_vjd", 3);

      var dynCall_vjji = Module["dynCall_vjji"] = createExportWrapper("dynCall_vjji", 4);

      var dynCall_vji = Module["dynCall_vji"] = createExportWrapper("dynCall_vji", 3);

      var dynCall_jijjj = Module["dynCall_jijjj"] = createExportWrapper("dynCall_jijjj", 5);

      var dynCall_ijjjjjjjjj = Module["dynCall_ijjjjjjjjj"] = createExportWrapper("dynCall_ijjjjjjjjj", 10);

      var dynCall_v = Module["dynCall_v"] = createExportWrapper("dynCall_v", 1);

      var dynCall_dj = Module["dynCall_dj"] = createExportWrapper("dynCall_dj", 2);

      var dynCall_ijjjjjij = Module["dynCall_ijjjjjij"] = createExportWrapper("dynCall_ijjjjjij", 8);

      var dynCall_ijjii = Module["dynCall_ijjii"] = createExportWrapper("dynCall_ijjii", 5);

      var dynCall_vij = Module["dynCall_vij"] = createExportWrapper("dynCall_vij", 3);

      var dynCall_iijji = Module["dynCall_iijji"] = createExportWrapper("dynCall_iijji", 5);

      var dynCall_ijjiijjjjj = Module["dynCall_ijjiijjjjj"] = createExportWrapper("dynCall_ijjiijjjjj", 10);

      var dynCall_ijijji = Module["dynCall_ijijji"] = createExportWrapper("dynCall_ijijji", 6);

      var dynCall_vijj = Module["dynCall_vijj"] = createExportWrapper("dynCall_vijj", 4);

      var dynCall_ijijjj = Module["dynCall_ijijjj"] = createExportWrapper("dynCall_ijijjj", 6);

      var dynCall_ijijjji = Module["dynCall_ijijjji"] = createExportWrapper("dynCall_ijijjji", 7);

      var dynCall_vjjjji = Module["dynCall_vjjjji"] = createExportWrapper("dynCall_vjjjji", 6);

      var dynCall_ijjiijj = Module["dynCall_ijjiijj"] = createExportWrapper("dynCall_ijjiijj", 7);

      var dynCall_vjii = Module["dynCall_vjii"] = createExportWrapper("dynCall_vjii", 4);

      var dynCall_ijjiijjjjjj = Module["dynCall_ijjiijjjjjj"] = createExportWrapper("dynCall_ijjiijjjjjj", 11);

      var dynCall_jjjjij = Module["dynCall_jjjjij"] = createExportWrapper("dynCall_jjjjij", 6);

      var dynCall_ijjjjji = Module["dynCall_ijjjjji"] = createExportWrapper("dynCall_ijjjjji", 7);

      var dynCall_jjjji = Module["dynCall_jjjji"] = createExportWrapper("dynCall_jjjji", 5);

      var dynCall_dd = Module["dynCall_dd"] = createExportWrapper("dynCall_dd", 2);

      var dynCall_ddd = Module["dynCall_ddd"] = createExportWrapper("dynCall_ddd", 3);

      var dynCall_jiii = Module["dynCall_jiii"] = createExportWrapper("dynCall_jiii", 4);

      var dynCall_jjii = Module["dynCall_jjii"] = createExportWrapper("dynCall_jjii", 4);

      var dynCall_ijiijj = Module["dynCall_ijiijj"] = createExportWrapper("dynCall_ijiijj", 6);

      var dynCall_ijjijij = Module["dynCall_ijjijij"] = createExportWrapper("dynCall_ijjijij", 7);

      var dynCall_jjji = Module["dynCall_jjji"] = createExportWrapper("dynCall_jjji", 4);

      var dynCall_ijdiiii = Module["dynCall_ijdiiii"] = createExportWrapper("dynCall_ijdiiii", 7);

      var dynCall_vjjjii = Module["dynCall_vjjjii"] = createExportWrapper("dynCall_vjjjii", 6);

      var dynCall_ijjjjjjjj = Module["dynCall_ijjjjjjjj"] = createExportWrapper("dynCall_ijjjjjjjj", 9);

      var dynCall_jjjjjjj = Module["dynCall_jjjjjjj"] = createExportWrapper("dynCall_jjjjjjj", 7);

      var dynCall_jjjjii = Module["dynCall_jjjjii"] = createExportWrapper("dynCall_jjjjii", 6);

      var dynCall_jjjjid = Module["dynCall_jjjjid"] = createExportWrapper("dynCall_jjjjid", 6);

      var dynCall_jjjjijj = Module["dynCall_jjjjijj"] = createExportWrapper("dynCall_jjjjijj", 7);

      var dynCall_jjjjjjjii = Module["dynCall_jjjjjjjii"] = createExportWrapper("dynCall_jjjjjjjii", 9);

      var dynCall_jjjjijii = Module["dynCall_jjjjijii"] = createExportWrapper("dynCall_jjjjijii", 8);

      var dynCall_jjjjijjj = Module["dynCall_jjjjijjj"] = createExportWrapper("dynCall_jjjjijjj", 8);

      var dynCall_jjjijijj = Module["dynCall_jjjijijj"] = createExportWrapper("dynCall_jjjijijj", 8);

      var dynCall_jjjijij = Module["dynCall_jjjijij"] = createExportWrapper("dynCall_jjjijij", 7);

      var dynCall_vjjjiij = Module["dynCall_vjjjiij"] = createExportWrapper("dynCall_vjjjiij", 7);

      var dynCall_vjjjjii = Module["dynCall_vjjjjii"] = createExportWrapper("dynCall_vjjjjii", 7);

      var dynCall_ifj = Module["dynCall_ifj"] = createExportWrapper("dynCall_ifj", 3);

      var dynCall_vijjjjjji = Module["dynCall_vijjjjjji"] = createExportWrapper("dynCall_vijjjjjji", 9);

      var dynCall_vjjjjj = Module["dynCall_vjjjjj"] = createExportWrapper("dynCall_vjjjjj", 6);

      var _asyncify_start_unwind = createExportWrapper("asyncify_start_unwind", 1);

      var _asyncify_stop_unwind = createExportWrapper("asyncify_stop_unwind", 0);

      var _asyncify_start_rewind = createExportWrapper("asyncify_start_rewind", 1);

      var _asyncify_stop_rewind = createExportWrapper("asyncify_stop_rewind", 0);

      var ___start_em_js = Module["___start_em_js"] = 543408;

      var ___stop_em_js = Module["___stop_em_js"] = 543834;

      function invoke_vjj(index, a1, a2) {
        var sp = stackSave();
        try {
          dynCall_vjj(Number(index), a1, a2);
        } catch (e) {
          stackRestore(sp);
          if (e !== e + 0) throw e;
          _setThrew(1, 0);
        }
      }

      function applySignatureConversions(wasmExports) {
        wasmExports = Object.assign({}, wasmExports);
        var makeWrapper_pp = f => function (a0) {
          return Number(f(BigInt(a0)));
        };
        var makeWrapper___PP = f => function (a0, a1, a2) {
          return f(a0, BigInt(a1 ? a1 : 0), BigInt(a2 ? a2 : 0));
        };
        var makeWrapper__p = f => function (a0) {
          return f(BigInt(a0));
        };
        var makeWrapper_ppp = f => function (a0, a1) {
          return Number(f(BigInt(a0), BigInt(a1)));
        };
        var makeWrapper_pP = f => function (a0) {
          return Number(f(BigInt(a0 ? a0 : 0)));
        };
        var makeWrapper_p = f => function () {
          return Number(f());
        };
        wasmExports["malloc"] = makeWrapper_pp(wasmExports["malloc"]);
        wasmExports["main"] = makeWrapper___PP(wasmExports["main"]);
        wasmExports["free"] = makeWrapper__p(wasmExports["free"]);
        wasmExports["fflush"] = makeWrapper__p(wasmExports["fflush"]);
        wasmExports["emscripten_builtin_memalign"] = makeWrapper_ppp(wasmExports["emscripten_builtin_memalign"]);
        wasmExports["sbrk"] = makeWrapper_pP(wasmExports["sbrk"]);
        wasmExports["setThrew"] = makeWrapper__p(wasmExports["setThrew"]);
        wasmExports["emscripten_stack_get_base"] = makeWrapper_p(wasmExports["emscripten_stack_get_base"]);
        wasmExports["emscripten_stack_get_end"] = makeWrapper_p(wasmExports["emscripten_stack_get_end"]);
        wasmExports["_emscripten_stack_restore"] = makeWrapper__p(wasmExports["_emscripten_stack_restore"]);
        wasmExports["_emscripten_stack_alloc"] = makeWrapper_pp(wasmExports["_emscripten_stack_alloc"]);
        wasmExports["emscripten_stack_get_current"] = makeWrapper_p(wasmExports["emscripten_stack_get_current"]);
        wasmExports["__cxa_is_pointer_type"] = makeWrapper__p(wasmExports["__cxa_is_pointer_type"]);
        wasmExports["asyncify_start_unwind"] = makeWrapper__p(wasmExports["asyncify_start_unwind"]);
        wasmExports["asyncify_start_rewind"] = makeWrapper__p(wasmExports["asyncify_start_rewind"]);
        return wasmExports;
      }

      var MAGIC = 0;

      Math.random = () => {
        MAGIC = Math.pow(MAGIC + 1.8912, 3) % 1;
        return MAGIC;
      };

      var TIME = 1e4;

      function deterministicNow() {
        return TIME++;
      }

      Date.now = deterministicNow;

      Module["thisProgram"] = "thisProgram";

      Module["addRunDependency"] = addRunDependency;

      Module["removeRunDependency"] = removeRunDependency;

      Module["FS_createPath"] = FS.createPath;

      Module["FS_createLazyFile"] = FS.createLazyFile;

      Module["FS_createDevice"] = FS.createDevice;

      Module["cwrap"] = cwrap;

      Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

      Module["FS_createDataFile"] = FS.createDataFile;

      Module["FS_unlink"] = FS.unlink;

      var missingLibrarySymbols = ["writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getTempRet0", "setTempRet0", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "emscriptenLog", "readEmAsmArgs", "jstoi_q", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "asmjsMangle", "HandleAllocator", "getNativeTypeSize", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "uleb128Encode", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayToString", "AsciiToString", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "stringToNewUTF8", "registerKeyEventCallback", "maybeCStringToJsString", "findEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "jsStackTrace", "getCallstack", "convertPCtoSourceLocation", "checkWasiClock", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "createDyncallWrapper", "safeSetTimeout", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "getPromise", "makePromise", "idsToPromises", "makePromiseCallback", "findMatchingCatch", "Browser_asyncPrepareDataCounter", "setMainLoop", "getSocketFromFD", "getSocketAddress", "FS_mkdirTree", "_setNetworkCallback", "heapObjectForWebGLType", "toTypedArrayIndex", "webgl_enable_ANGLE_instanced_arrays", "webgl_enable_OES_vertex_array_object", "webgl_enable_WEBGL_draw_buffers", "webgl_enable_WEBGL_multi_draw", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "writeGLArray", "registerWebGlEventCallback", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "writeStringToMemory", "writeAsciiToMemory", "setErrNo", "demangle", "stackTrace"];

      missingLibrarySymbols.forEach(missingLibrarySymbol);

      var unexportedSymbols = ["run", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "FS_createFolder", "FS_createLink", "FS_readFile", "out", "err", "callMain", "abort", "wasmMemory", "wasmExports", "writeStackCookie", "checkStackCookie", "readI53FromI64", "MAX_INT53", "MIN_INT53", "bigintToI53Checked", "stackSave", "stackRestore", "stackAlloc", "ptrToString", "zeroMemory", "exitJS", "getHeapMax", "growMemory", "ENV", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "isLeapYear", "ydayFromDate", "arraySum", "addDays", "ERRNO_CODES", "ERRNO_MESSAGES", "DNS", "Protocols", "Sockets", "initRandomFill", "randomFill", "timers", "warnOnce", "readEmAsmArgsArray", "jstoi_s", "getExecutableName", "handleException", "keepRuntimeAlive", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "asyncLoad", "alignMemory", "mmapAlloc", "wasmTable", "noExitRuntime", "getCFunc", "ccall", "sigToWasmTypes", "freeTableIndexes", "functionsInTableMap", "setValue", "getValue", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "intArrayFromString", "stringToAscii", "UTF16Decoder", "stringToUTF8OnStack", "writeArrayToMemory", "JSEvents", "specialHTMLTargets", "findCanvasEventTarget", "currentFullscreenStrategy", "restoreOldWindowedStyle", "UNWIND_CACHE", "ExitStatus", "getEnvStrings", "doReadv", "doWritev", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "Browser", "getPreloadedImageData__data", "wget", "SYSCALLS", "preloadPlugins", "FS_modeStringToFlags", "FS_getMode", "FS_stdin_getChar_buffer", "FS_stdin_getChar", "FS", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "GL", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "runAndAbortIfError", "Asyncify", "Fibers", "SDL", "SDL_gfx", "allocateUTF8", "allocateUTF8OnStack"];

      unexportedSymbols.forEach(unexportedRuntimeSymbol);

      var calledRun;

      dependenciesFulfilled = function runCaller() {
        if (!calledRun) run();
        if (!calledRun) dependenciesFulfilled = runCaller;
      };

      function stackCheckInit() {
        _emscripten_stack_init();
        writeStackCookie();
      }

      function run() {
        if (runDependencies > 0) {
          return;
        }
        stackCheckInit();
        preRun();
        if (runDependencies > 0) {
          return;
        }
        function doRun() {
          if (calledRun) return;
          calledRun = true;
          Module["calledRun"] = true;
          if (ABORT) return;
          initRuntime();
          readyPromiseResolve(Module);
          if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
          assert(!Module["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
          postRun();
        }
        if (Module["setStatus"]) {
          Module["setStatus"]("Running...");
          setTimeout(function () {
            setTimeout(function () {
              Module["setStatus"]("");
            }, 1);
            doRun();
          }, 1);
        } else {
          doRun();
        }
        checkStackCookie();
      }

      function checkUnflushedContent() {
        var oldOut = out;
        var oldErr = err;
        var has = false;
        out = err = x => {
          has = true;
        };
        try {
          _fflush(0);
          ["stdout", "stderr"].forEach(function (name) {
            var info = FS.analyzePath("/dev/" + name);
            if (!info) return;
            var stream = info.object;
            var rdev = stream.rdev;
            var tty = TTY.ttys[rdev];
            if (tty?.output?.length) {
              has = true;
            }
          });
        } catch (e) { }
        out = oldOut;
        err = oldErr;
        if (has) {
          warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.");
        }
      }

      if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
          Module["preInit"].pop()();
        }
      }

      run();



      moduleRtn = readyPromise;

      Module.resizeHeap = _emscripten_resize_heap;

      for (const prop of Object.keys(Module)) {
        if (!(prop in moduleArg)) {
          Object.defineProperty(moduleArg, prop, {
            configurable: true,
            get() {
              abort(`Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`);
            }
          });
        }
      }

      return moduleRtn;
    }
  );
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = Module;
else if (typeof define === 'function' && define['amd'])
  define([], () => Module);