var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all3) => {
  for (var name in all3)
    __defProp(target, name, { get: all3[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/json-logic-js/logic.js
var require_logic = __commonJS({
  "node_modules/json-logic-js/logic.js"(exports, module) {
    (function(root, factory) {
      if (typeof define === "function" && define.amd) {
        define(factory);
      } else if (typeof exports === "object") {
        module.exports = factory();
      } else {
        root.jsonLogic = factory();
      }
    })(exports, function() {
      "use strict";
      if (!Array.isArray) {
        Array.isArray = function(arg) {
          return Object.prototype.toString.call(arg) === "[object Array]";
        };
      }
      function arrayUnique(array) {
        var a = [];
        for (var i = 0, l = array.length; i < l; i++) {
          if (a.indexOf(array[i]) === -1) {
            a.push(array[i]);
          }
        }
        return a;
      }
      var jsonLogic3 = {};
      var operations = {
        "==": function(a, b) {
        return a == b;
      },
      "===": function(a, b) {
        return a === b;
      },
      "!=": function(a, b) {
        return a != b;
      },
      "!==": function(a, b) {
        return a !== b;
      },
      ">": function(a, b) {
        return a > b;
      },
      ">=": function(a, b) {
        return a >= b;
      },
      "<": function(a, b, c2) {
        return c2 === void 0 ? a < b : a < b && b < c2;
      },
      "<=": function(a, b, c2) {
        return c2 === void 0 ? a <= b : a <= b && b <= c2;
      },
      "!!": function(a) {
        return jsonLogic3.truthy(a);
      },
      "!": function(a) {
        return !jsonLogic3.truthy(a);
      },
      "%": function(a, b) {
        return a % b;
      },
      "log": function(a) {
        console.log(a);
        return a;
      },
      "in": function(a, b) {
        if (!b || typeof b.indexOf === "undefined")
        return false;
        return b.indexOf(a) !== -1;
      },
      "cat": function() {
        return Array.prototype.join.call(arguments, "");
      },
      "substr": function(source, start, end) {
        if (end < 0) {
          var temp = String(source).substr(start);
          return temp.substr(0, temp.length + end);
        }
        return String(source).substr(start, end);
      },
      "+": function() {
        return Array.prototype.reduce.call(arguments, function(a, b) {
          return parseFloat(a, 10) + parseFloat(b, 10);
        }, 0);
      },
      "*": function() {
        return Array.prototype.reduce.call(arguments, function(a, b) {
          return parseFloat(a, 10) * parseFloat(b, 10);
        });
      },
      "-": function(a, b) {
        if (b === void 0) {
          return -a;
        } else {
          return a - b;
        }
      },
      "/": function(a, b) {
        return a / b;
      },
      "min": function() {
        return Math.min.apply(this, arguments);
      },
      "max": function() {
        return Math.max.apply(this, arguments);
      },
      "merge": function() {
        return Array.prototype.reduce.call(arguments, function(a, b) {
          return a.concat(b);
        }, []);
      },
      "var": function(a, b) {
        var not_found = b === void 0 ? null : b;
        var data = this;
        if (typeof a === "undefined" || a === "" || a === null) {
          return data;
        }
        var sub_props = String(a).split(".");
        for (var i = 0; i < sub_props.length; i++) {
          if (data === null || data === void 0) {
            return not_found;
          }
          data = data[sub_props[i]];
          if (data === void 0) {
            return not_found;
          }
        }
        return data;
      },
      "missing": function() {
        var missing = [];
        var keys6 = Array.isArray(arguments[0]) ? arguments[0] : arguments;
        for (var i = 0; i < keys6.length; i++) {
          var key = keys6[i];
          var value = jsonLogic3.apply({ "var": key }, this);
          if (value === null || value === "") {
            missing.push(key);
          }
        }
        return missing;
      },
      "missing_some": function(need_count, options) {
        var are_missing = jsonLogic3.apply({ "missing": options }, this);
        if (options.length - are_missing.length >= need_count) {
          return [];
        } else {
          return are_missing;
        }
      }
    };
      jsonLogic3.is_logic = function(logic) {
        return typeof logic === "object" && logic !== null && !Array.isArray(logic) && Object.keys(logic).length === 1;
      };
      jsonLogic3.truthy = function(value) {
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
        return !!value;
      };
      jsonLogic3.get_operator = function(logic) {
        return Object.keys(logic)[0];
      };
      jsonLogic3.get_values = function(logic) {
        return logic[jsonLogic3.get_operator(logic)];
      };
      jsonLogic3.apply = function(logic, data) {
        if (Array.isArray(logic)) {
          return logic.map(function(l) {
            return jsonLogic3.apply(l, data);
          });
        }
        if (!jsonLogic3.is_logic(logic)) {
          return logic;
        }
        var op = jsonLogic3.get_operator(logic);
        var values4 = logic[op];
        var i;
        var current;
        var scopedLogic;
        var scopedData;
        var initial;
        if (!Array.isArray(values4)) {
          values4 = [values4];
        }
        if (op === "if" || op == "?:") {
          for (i = 0; i < values4.length - 1; i += 2) {
            if (jsonLogic3.truthy(jsonLogic3.apply(values4[i], data))) {
              return jsonLogic3.apply(values4[i + 1], data);
            }
          }
          if (values4.length === i + 1) {
            return jsonLogic3.apply(values4[i], data);
          }
          return null;
        } else if (op === "and") {
          for (i = 0; i < values4.length; i += 1) {
            current = jsonLogic3.apply(values4[i], data);
            if (!jsonLogic3.truthy(current)) {
              return current;
            }
          }
          return current;
        } else if (op === "or") {
          for (i = 0; i < values4.length; i += 1) {
            current = jsonLogic3.apply(values4[i], data);
            if (jsonLogic3.truthy(current)) {
              return current;
            }
          }
          return current;
        } else if (op === "filter") {
          scopedData = jsonLogic3.apply(values4[0], data);
          scopedLogic = values4[1];
          if (!Array.isArray(scopedData)) {
            return [];
          }
          return scopedData.filter(function(datum) {
            return jsonLogic3.truthy(jsonLogic3.apply(scopedLogic, datum));
          });
        } else if (op === "map") {
          scopedData = jsonLogic3.apply(values4[0], data);
          scopedLogic = values4[1];
          if (!Array.isArray(scopedData)) {
            return [];
          }
          return scopedData.map(function(datum) {
            return jsonLogic3.apply(scopedLogic, datum);
          });
        } else if (op === "reduce") {
          scopedData = jsonLogic3.apply(values4[0], data);
          scopedLogic = values4[1];
          initial = typeof values4[2] !== "undefined" ? values4[2] : null;
          if (!Array.isArray(scopedData)) {
            return initial;
          }
          return scopedData.reduce(
            function(accumulator, current2) {
              return jsonLogic3.apply(
                scopedLogic,
                { current: current2, accumulator }
              );
            },
            initial
          );
        } else if (op === "all") {
          scopedData = jsonLogic3.apply(values4[0], data);
          scopedLogic = values4[1];
          if (!Array.isArray(scopedData) || !scopedData.length) {
            return false;
          }
          for (i = 0; i < scopedData.length; i += 1) {
            if (!jsonLogic3.truthy(jsonLogic3.apply(scopedLogic, scopedData[i]))) {
              return false;
            }
          }
          return true;
        } else if (op === "none") {
          scopedData = jsonLogic3.apply(values4[0], data);
          scopedLogic = values4[1];
          if (!Array.isArray(scopedData) || !scopedData.length) {
            return true;
          }
          for (i = 0; i < scopedData.length; i += 1) {
            if (jsonLogic3.truthy(jsonLogic3.apply(scopedLogic, scopedData[i]))) {
              return false;
            }
          }
          return true;
        } else if (op === "some") {
          scopedData = jsonLogic3.apply(values4[0], data);
          scopedLogic = values4[1];
          if (!Array.isArray(scopedData) || !scopedData.length) {
            return false;
          }
          for (i = 0; i < scopedData.length; i += 1) {
            if (jsonLogic3.truthy(jsonLogic3.apply(scopedLogic, scopedData[i]))) {
              return true;
            }
          }
          return false;
        }
        values4 = values4.map(function(val) {
          return jsonLogic3.apply(val, data);
        });
        if (operations.hasOwnProperty(op) && typeof operations[op] === "function") {
          return operations[op].apply(data, values4);
        } else if (op.indexOf(".") > 0) {
          var sub_ops = String(op).split(".");
          var operation = operations;
          for (i = 0; i < sub_ops.length; i++) {
            if (!operation.hasOwnProperty(sub_ops[i])) {
              throw new Error("Unrecognized operation " + op + " (failed at " + sub_ops.slice(0, i + 1).join(".") + ")");
            }
            operation = operation[sub_ops[i]];
          }
          return operation.apply(data, values4);
        }
        throw new Error("Unrecognized operation " + op);
      };
      jsonLogic3.uses_data = function(logic) {
        var collection = [];
        if (jsonLogic3.is_logic(logic)) {
          var op = jsonLogic3.get_operator(logic);
          var values4 = logic[op];
          if (!Array.isArray(values4)) {
            values4 = [values4];
          }
          if (op === "var") {
            collection.push(values4[0]);
          } else {
            values4.forEach(function(val) {
              collection.push.apply(collection, jsonLogic3.uses_data(val));
            });
          }
        }
        return arrayUnique(collection);
      };
      jsonLogic3.add_operation = function(name, code) {
        operations[name] = code;
      };
      jsonLogic3.rm_operation = function(name) {
        delete operations[name];
      };
      jsonLogic3.rule_like = function(rule, pattern) {
        if (pattern === rule) {
          return true;
        }
        if (pattern === "@") {
          return true;
        }
        if (pattern === "number") {
          return typeof rule === "number";
        }
        if (pattern === "string") {
          return typeof rule === "string";
        }
        if (pattern === "array") {
          return Array.isArray(rule) && !jsonLogic3.is_logic(rule);
        }
        if (jsonLogic3.is_logic(pattern)) {
          if (jsonLogic3.is_logic(rule)) {
            var pattern_op = jsonLogic3.get_operator(pattern);
            var rule_op = jsonLogic3.get_operator(rule);
            if (pattern_op === "@" || pattern_op === rule_op) {
              return jsonLogic3.rule_like(
                jsonLogic3.get_values(rule, false),
                jsonLogic3.get_values(pattern, false)
              );
            }
          }
          return false;
        }
        if (Array.isArray(pattern)) {
          if (Array.isArray(rule)) {
            if (pattern.length !== rule.length) {
              return false;
            }
            for (var i = 0; i < pattern.length; i += 1) {
              if (!jsonLogic3.rule_like(rule[i], pattern[i])) {
                return false;
              }
            }
            return true;
          } else {
            return false;
          }
        }
        return false;
      };
      return jsonLogic3;
    });
  }
});

// node_modules/punycode/punycode.js
var require_punycode = __commonJS({
  "node_modules/punycode/punycode.js"(exports, module) {
    (function(root) {
      var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
      var freeModule = typeof module == "object" && module && !module.nodeType && module;
      var freeGlobal = typeof global == "object" && global;
      if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
        root = freeGlobal;
      }
      var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
        "overflow": "Overflow: input needs wider integers to process",
        "not-basic": "Illegal input >= 0x80 (not a basic code point)",
        "invalid-input": "Invalid input"
    }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
      function error(type3) {
        throw RangeError(errors[type3]);
      }
      function map4(array, fn) {
        var length3 = array.length;
        var result = [];
        while (length3--) {
          result[length3] = fn(array[length3]);
        }
        return result;
      }
      function mapDomain(string, fn) {
        var parts = string.split("@");
        var result = "";
        if (parts.length > 1) {
          result = parts[0] + "@";
          string = parts[1];
        }
        string = string.replace(regexSeparators, ".");
        var labels = string.split(".");
        var encoded = map4(labels, fn).join(".");
        return result + encoded;
      }
      function ucs2decode(string) {
        var output = [], counter = 0, length3 = string.length, value, extra;
        while (counter < length3) {
          value = string.charCodeAt(counter++);
          if (value >= 55296 && value <= 56319 && counter < length3) {
            extra = string.charCodeAt(counter++);
            if ((extra & 64512) == 56320) {
              output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
            } else {
              output.push(value);
              counter--;
            }
          } else {
            output.push(value);
          }
        }
        return output;
      }
      function ucs2encode(array) {
        return map4(array, function(value) {
          var output = "";
          if (value > 65535) {
            value -= 65536;
            output += stringFromCharCode(value >>> 10 & 1023 | 55296);
            value = 56320 | value & 1023;
          }
          output += stringFromCharCode(value);
          return output;
        }).join("");
      }
      function basicToDigit(codePoint) {
        if (codePoint - 48 < 10) {
          return codePoint - 22;
        }
        if (codePoint - 65 < 26) {
          return codePoint - 65;
        }
        if (codePoint - 97 < 26) {
          return codePoint - 97;
        }
        return base;
      }
      function digitToBasic(digit, flag) {
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
      }
      function adapt(delta, numPoints, firstTime) {
        var k = 0;
        delta = firstTime ? floor(delta / damp) : delta >> 1;
        delta += floor(delta / numPoints);
        for (; delta > baseMinusTMin * tMax >> 1; k += base) {
          delta = floor(delta / baseMinusTMin);
        }
        return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
      }
      function decode(input) {
        var output = [], inputLength = input.length, out, i = 0, n2 = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
        basic = input.lastIndexOf(delimiter);
        if (basic < 0) {
          basic = 0;
        }
        for (j = 0; j < basic; ++j) {
          if (input.charCodeAt(j) >= 128) {
            error("not-basic");
          }
          output.push(input.charCodeAt(j));
        }
        for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
          for (oldi = i, w = 1, k = base; ; k += base) {
            if (index >= inputLength) {
              error("invalid-input");
            }
            digit = basicToDigit(input.charCodeAt(index++));
            if (digit >= base || digit > floor((maxInt - i) / w)) {
              error("overflow");
            }
            i += digit * w;
            t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
            if (digit < t) {
              break;
            }
            baseMinusT = base - t;
            if (w > floor(maxInt / baseMinusT)) {
              error("overflow");
            }
            w *= baseMinusT;
          }
          out = output.length + 1;
          bias = adapt(i - oldi, out, oldi == 0);
          if (floor(i / out) > maxInt - n2) {
            error("overflow");
          }
          n2 += floor(i / out);
          i %= out;
          output.splice(i++, 0, n2);
        }
        return ucs2encode(output);
      }
      function encode(input) {
        var n2, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
        input = ucs2decode(input);
        inputLength = input.length;
        n2 = initialN;
        delta = 0;
        bias = initialBias;
        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue < 128) {
            output.push(stringFromCharCode(currentValue));
          }
        }
        handledCPCount = basicLength = output.length;
        if (basicLength) {
          output.push(delimiter);
        }
        while (handledCPCount < inputLength) {
          for (m = maxInt, j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue >= n2 && currentValue < m) {
              m = currentValue;
            }
          }
          handledCPCountPlusOne = handledCPCount + 1;
          if (m - n2 > floor((maxInt - delta) / handledCPCountPlusOne)) {
            error("overflow");
          }
          delta += (m - n2) * handledCPCountPlusOne;
          n2 = m;
          for (j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue < n2 && ++delta > maxInt) {
              error("overflow");
            }
            if (currentValue == n2) {
              for (q = delta, k = base; ; k += base) {
                t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                if (q < t) {
                  break;
                }
                qMinusT = q - t;
                baseMinusT = base - t;
                output.push(
                  stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                );
                q = floor(qMinusT / baseMinusT);
              }
              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }
          ++delta;
          ++n2;
        }
        return output.join("");
      }
      function toUnicode(input) {
        return mapDomain(input, function(string) {
          return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
        });
      }
      function toASCII(input) {
        return mapDomain(input, function(string) {
          return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
        });
      }
      punycode = {
        "version": "1.3.2",
        "ucs2": {
          "decode": ucs2decode,
          "encode": ucs2encode
        },
        "decode": decode,
        "encode": encode,
        "toASCII": toASCII,
        "toUnicode": toUnicode
      };
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        define("punycode", function() {
          return punycode;
        });
      } else if (freeExports && freeModule) {
        if (module.exports == freeExports) {
          freeModule.exports = punycode;
        } else {
          for (key in punycode) {
            punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
          }
        }
      } else {
        root.punycode = punycode;
      }
    })(exports);
  }
});

// node_modules/url/util.js
var require_util = __commonJS({
  "node_modules/url/util.js"(exports, module) {
    "use strict";
    module.exports = {
      isString: function(arg) {
        return typeof arg === "string";
      },
      isObject: function(arg) {
        return typeof arg === "object" && arg !== null;
      },
      isNull: function(arg) {
        return arg === null;
      },
      isNullOrUndefined: function(arg) {
        return arg == null;
      }
    };
  }
});

// node_modules/querystring/decode.js
var require_decode = __commonJS({
  "node_modules/querystring/decode.js"(exports, module) {
    "use strict";
    function hasOwnProperty(obj, prop4) {
      return Object.prototype.hasOwnProperty.call(obj, prop4);
    }
    module.exports = function(qs, sep, eq, options) {
      sep = sep || "&";
      eq = eq || "=";
      var obj = {};
      if (typeof qs !== "string" || qs.length === 0) {
        return obj;
      }
      var regexp = /\+/g;
      qs = qs.split(sep);
      var maxKeys = 1e3;
      if (options && typeof options.maxKeys === "number") {
        maxKeys = options.maxKeys;
      }
      var len = qs.length;
      if (maxKeys > 0 && len > maxKeys) {
        len = maxKeys;
      }
      for (var i = 0; i < len; ++i) {
        var x = qs[i].replace(regexp, "%20"), idx = x.indexOf(eq), kstr, vstr, k, v;
        if (idx >= 0) {
          kstr = x.substr(0, idx);
          vstr = x.substr(idx + 1);
        } else {
          kstr = x;
          vstr = "";
        }
        k = decodeURIComponent(kstr);
        v = decodeURIComponent(vstr);
        if (!hasOwnProperty(obj, k)) {
          obj[k] = v;
        } else if (Array.isArray(obj[k])) {
          obj[k].push(v);
        } else {
          obj[k] = [obj[k], v];
        }
      }
      return obj;
    };
  }
});

// node_modules/querystring/encode.js
var require_encode = __commonJS({
  "node_modules/querystring/encode.js"(exports, module) {
    "use strict";
    var stringifyPrimitive = function(v) {
      switch (typeof v) {
        case "string":
          return v;
        case "boolean":
          return v ? "true" : "false";
        case "number":
          return isFinite(v) ? v : "";
        default:
          return "";
      }
    };
    module.exports = function(obj, sep, eq, name) {
      sep = sep || "&";
      eq = eq || "=";
      if (obj === null) {
        obj = void 0;
      }
      if (typeof obj === "object") {
        return Object.keys(obj).map(function(k) {
          var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
          if (Array.isArray(obj[k])) {
            return obj[k].map(function(v) {
              return ks + encodeURIComponent(stringifyPrimitive(v));
            }).join(sep);
          } else {
            return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
          }
        }).join(sep);
      }
      if (!name)
        return "";
      return encodeURIComponent(stringifyPrimitive(name)) + eq + encodeURIComponent(stringifyPrimitive(obj));
    };
  }
});

// node_modules/querystring/index.js
var require_querystring = __commonJS({
  "node_modules/querystring/index.js"(exports) {
    "use strict";
    exports.decode = exports.parse = require_decode();
    exports.encode = exports.stringify = require_encode();
  }
});

// node_modules/url/url.js
var require_url = __commonJS({
  "node_modules/url/url.js"(exports) {
    "use strict";
    var punycode = require_punycode();
    var util = require_util();
    exports.parse = urlParse;
    exports.resolve = urlResolve;
    exports.resolveObject = urlResolveObject;
    exports.format = urlFormat;
    exports.Url = Url;
    function Url() {
      this.protocol = null;
      this.slashes = null;
      this.auth = null;
      this.host = null;
      this.port = null;
      this.hostname = null;
      this.hash = null;
      this.search = null;
      this.query = null;
      this.pathname = null;
      this.path = null;
      this.href = null;
    }
    var protocolPattern = /^([a-z0-9.+-]+:)/i;
    var portPattern = /:[0-9]*$/;
    var simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/;
    var delims = ["<", ">", '"', "`", " ", "\r", "\n", "	"];
      var unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims);
    var autoEscape = ["'"].concat(unwise);
    var nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape);
    var hostEndingChars = ["/", "?", "#"];
    var hostnameMaxLen = 255;
    var hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/;
    var hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/;
    var unsafeProtocol = {
      "javascript": true,
      "javascript:": true
  };
    var hostlessProtocol = {
      "javascript": true,
      "javascript:": true
  };
    var slashedProtocol = {
      "http": true,
      "https": true,
      "ftp": true,
      "gopher": true,
      "file": true,
      "http:": true,
      "https:": true,
      "ftp:": true,
      "gopher:": true,
      "file:": true
  };
    var querystring = require_querystring();
    function urlParse(url, parseQueryString, slashesDenoteHost) {
      if (url && util.isObject(url) && url instanceof Url)
        return url;
      var u = new Url();
      u.parse(url, parseQueryString, slashesDenoteHost);
      return u;
    }
    Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
      if (!util.isString(url)) {
        throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
      }
      var queryIndex = url.indexOf("?"), splitter = queryIndex !== -1 && queryIndex < url.indexOf("#") ? "?" : "#", uSplit = url.split(splitter), slashRegex = /\\/g;
      uSplit[0] = uSplit[0].replace(slashRegex, "/");
      url = uSplit.join(splitter);
      var rest = url;
      rest = rest.trim();
      if (!slashesDenoteHost && url.split("#").length === 1) {
        var simplePath = simplePathPattern.exec(rest);
        if (simplePath) {
          this.path = rest;
          this.href = rest;
          this.pathname = simplePath[1];
          if (simplePath[2]) {
            this.search = simplePath[2];
            if (parseQueryString) {
              this.query = querystring.parse(this.search.substr(1));
            } else {
              this.query = this.search.substr(1);
            }
          } else if (parseQueryString) {
            this.search = "";
            this.query = {};
          }
          return this;
        }
      }
      var proto = protocolPattern.exec(rest);
      if (proto) {
        proto = proto[0];
        var lowerProto = proto.toLowerCase();
        this.protocol = lowerProto;
        rest = rest.substr(proto.length);
      }
      if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
        var slashes = rest.substr(0, 2) === "//";
        if (slashes && !(proto && hostlessProtocol[proto])) {
          rest = rest.substr(2);
          this.slashes = true;
        }
      }
      if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
        var hostEnd = -1;
        for (var i = 0; i < hostEndingChars.length; i++) {
          var hec = rest.indexOf(hostEndingChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
            hostEnd = hec;
        }
        var auth, atSign;
        if (hostEnd === -1) {
          atSign = rest.lastIndexOf("@");
        } else {
          atSign = rest.lastIndexOf("@", hostEnd);
        }
        if (atSign !== -1) {
          auth = rest.slice(0, atSign);
          rest = rest.slice(atSign + 1);
          this.auth = decodeURIComponent(auth);
        }
        hostEnd = -1;
        for (var i = 0; i < nonHostChars.length; i++) {
          var hec = rest.indexOf(nonHostChars[i]);
          if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
            hostEnd = hec;
        }
        if (hostEnd === -1)
          hostEnd = rest.length;
        this.host = rest.slice(0, hostEnd);
        rest = rest.slice(hostEnd);
        this.parseHost();
        this.hostname = this.hostname || "";
        var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
        if (!ipv6Hostname) {
          var hostparts = this.hostname.split(/\./);
          for (var i = 0, l = hostparts.length; i < l; i++) {
            var part = hostparts[i];
            if (!part)
              continue;
            if (!part.match(hostnamePartPattern)) {
              var newpart = "";
              for (var j = 0, k = part.length; j < k; j++) {
                if (part.charCodeAt(j) > 127) {
                  newpart += "x";
                } else {
                  newpart += part[j];
                }
              }
              if (!newpart.match(hostnamePartPattern)) {
                var validParts = hostparts.slice(0, i);
                var notHost = hostparts.slice(i + 1);
                var bit = part.match(hostnamePartStart);
                if (bit) {
                  validParts.push(bit[1]);
                  notHost.unshift(bit[2]);
                }
                if (notHost.length) {
                  rest = "/" + notHost.join(".") + rest;
                }
                this.hostname = validParts.join(".");
                break;
              }
            }
          }
        }
        if (this.hostname.length > hostnameMaxLen) {
          this.hostname = "";
        } else {
          this.hostname = this.hostname.toLowerCase();
        }
        if (!ipv6Hostname) {
          this.hostname = punycode.toASCII(this.hostname);
        }
        var p = this.port ? ":" + this.port : "";
        var h = this.hostname || "";
        this.host = h + p;
        this.href += this.host;
        if (ipv6Hostname) {
          this.hostname = this.hostname.substr(1, this.hostname.length - 2);
          if (rest[0] !== "/") {
            rest = "/" + rest;
          }
        }
      }
      if (!unsafeProtocol[lowerProto]) {
        for (var i = 0, l = autoEscape.length; i < l; i++) {
          var ae = autoEscape[i];
          if (rest.indexOf(ae) === -1)
            continue;
          var esc = encodeURIComponent(ae);
          if (esc === ae) {
            esc = escape(ae);
          }
          rest = rest.split(ae).join(esc);
        }
      }
      var hash = rest.indexOf("#");
      if (hash !== -1) {
        this.hash = rest.substr(hash);
        rest = rest.slice(0, hash);
      }
      var qm = rest.indexOf("?");
      if (qm !== -1) {
        this.search = rest.substr(qm);
        this.query = rest.substr(qm + 1);
        if (parseQueryString) {
          this.query = querystring.parse(this.query);
        }
        rest = rest.slice(0, qm);
      } else if (parseQueryString) {
        this.search = "";
        this.query = {};
      }
      if (rest)
        this.pathname = rest;
      if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
        this.pathname = "/";
      }
      if (this.pathname || this.search) {
        var p = this.pathname || "";
        var s = this.search || "";
        this.path = p + s;
      }
      this.href = this.format();
      return this;
    };
    function urlFormat(obj) {
      if (util.isString(obj))
        obj = urlParse(obj);
      if (!(obj instanceof Url))
        return Url.prototype.format.call(obj);
      return obj.format();
    }
    Url.prototype.format = function() {
      var auth = this.auth || "";
      if (auth) {
        auth = encodeURIComponent(auth);
        auth = auth.replace(/%3A/i, ":");
        auth += "@";
      }
      var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
      if (this.host) {
        host = auth + this.host;
      } else if (this.hostname) {
        host = auth + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]");
        if (this.port) {
          host += ":" + this.port;
        }
      }
      if (this.query && util.isObject(this.query) && Object.keys(this.query).length) {
        query = querystring.stringify(this.query);
      }
      var search = this.search || query && "?" + query || "";
      if (protocol && protocol.substr(-1) !== ":")
      protocol += ":";
      if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
        host = "//" + (host || "");
        if (pathname && pathname.charAt(0) !== "/")
          pathname = "/" + pathname;
      } else if (!host) {
        host = "";
      }
      if (hash && hash.charAt(0) !== "#")
      hash = "#" + hash;
      if (search && search.charAt(0) !== "?")
        search = "?" + search;
      pathname = pathname.replace(/[?#]/g, function(match3) {
        return encodeURIComponent(match3);
      });
      search = search.replace("#", "%23");
      return protocol + host + pathname + search + hash;
    };
    function urlResolve(source, relative) {
      return urlParse(source, false, true).resolve(relative);
    }
    Url.prototype.resolve = function(relative) {
      return this.resolveObject(urlParse(relative, false, true)).format();
    };
    function urlResolveObject(source, relative) {
      if (!source)
        return relative;
      return urlParse(source, false, true).resolveObject(relative);
    }
    Url.prototype.resolveObject = function(relative) {
      if (util.isString(relative)) {
        var rel = new Url();
        rel.parse(relative, false, true);
        relative = rel;
      }
      var result = new Url();
      var tkeys = Object.keys(this);
      for (var tk = 0; tk < tkeys.length; tk++) {
        var tkey = tkeys[tk];
        result[tkey] = this[tkey];
      }
      result.hash = relative.hash;
      if (relative.href === "") {
        result.href = result.format();
        return result;
      }
      if (relative.slashes && !relative.protocol) {
        var rkeys = Object.keys(relative);
        for (var rk = 0; rk < rkeys.length; rk++) {
          var rkey = rkeys[rk];
          if (rkey !== "protocol")
          result[rkey] = relative[rkey];
        }
        if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
          result.path = result.pathname = "/";
        }
        result.href = result.format();
        return result;
      }
      if (relative.protocol && relative.protocol !== result.protocol) {
        if (!slashedProtocol[relative.protocol]) {
          var keys6 = Object.keys(relative);
          for (var v = 0; v < keys6.length; v++) {
            var k = keys6[v];
            result[k] = relative[k];
          }
          result.href = result.format();
          return result;
        }
        result.protocol = relative.protocol;
        if (!relative.host && !hostlessProtocol[relative.protocol]) {
          var relPath = (relative.pathname || "").split("/");
          while (relPath.length && !(relative.host = relPath.shift()))
            ;
          if (!relative.host)
            relative.host = "";
          if (!relative.hostname)
            relative.hostname = "";
          if (relPath[0] !== "")
          relPath.unshift("");
          if (relPath.length < 2)
            relPath.unshift("");
          result.pathname = relPath.join("/");
        } else {
          result.pathname = relative.pathname;
        }
        result.search = relative.search;
        result.query = relative.query;
        result.host = relative.host || "";
        result.auth = relative.auth;
        result.hostname = relative.hostname || relative.host;
        result.port = relative.port;
        if (result.pathname || result.search) {
          var p = result.pathname || "";
          var s = result.search || "";
          result.path = p + s;
        }
        result.slashes = result.slashes || relative.slashes;
        result.href = result.format();
        return result;
      }
      var isSourceAbs = result.pathname && result.pathname.charAt(0) === "/", isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === "/", mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
      if (psychotic) {
        result.hostname = "";
        result.port = null;
        if (result.host) {
          if (srcPath[0] === "")
          srcPath[0] = result.host;
        else
          srcPath.unshift(result.host);
        }
        result.host = "";
        if (relative.protocol) {
          relative.hostname = null;
          relative.port = null;
          if (relative.host) {
            if (relPath[0] === "")
            relPath[0] = relative.host;
          else
            relPath.unshift(relative.host);
          }
          relative.host = null;
        }
        mustEndAbs = mustEndAbs && (relPath[0] === "" || srcPath[0] === "");
      }
      if (isRelAbs) {
        result.host = relative.host || relative.host === "" ? relative.host : result.host;
        result.hostname = relative.hostname || relative.hostname === "" ? relative.hostname : result.hostname;
        result.search = relative.search;
        result.query = relative.query;
        srcPath = relPath;
      } else if (relPath.length) {
        if (!srcPath)
          srcPath = [];
        srcPath.pop();
        srcPath = srcPath.concat(relPath);
        result.search = relative.search;
        result.query = relative.query;
      } else if (!util.isNullOrUndefined(relative.search)) {
        if (psychotic) {
          result.hostname = result.host = srcPath.shift();
          var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
          if (authInHost) {
            result.auth = authInHost.shift();
            result.host = result.hostname = authInHost.shift();
          }
        }
        result.search = relative.search;
        result.query = relative.query;
        if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
          result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
        }
        result.href = result.format();
        return result;
      }
      if (!srcPath.length) {
        result.pathname = null;
        if (result.search) {
          result.path = "/" + result.search;
        } else {
          result.path = null;
        }
        result.href = result.format();
        return result;
      }
      var last2 = srcPath.slice(-1)[0];
      var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last2 === "." || last2 === "..") || last2 === "";
      var up = 0;
      for (var i = srcPath.length; i >= 0; i--) {
        last2 = srcPath[i];
        if (last2 === ".") {
          srcPath.splice(i, 1);
        } else if (last2 === "..") {
          srcPath.splice(i, 1);
          up++;
        } else if (up) {
          srcPath.splice(i, 1);
          up--;
        }
      }
      if (!mustEndAbs && !removeAllDots) {
        for (; up--; up) {
          srcPath.unshift("..");
        }
      }
      if (mustEndAbs && srcPath[0] !== "" && (!srcPath[0] || srcPath[0].charAt(0) !== "/")) {
        srcPath.unshift("");
      }
      if (hasTrailingSlash && srcPath.join("/").substr(-1) !== "/") {
        srcPath.push("");
      }
      var isAbsolute = srcPath[0] === "" || srcPath[0] && srcPath[0].charAt(0) === "/";
      if (psychotic) {
        result.hostname = result.host = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
        var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
        if (authInHost) {
          result.auth = authInHost.shift();
          result.host = result.hostname = authInHost.shift();
        }
      }
      mustEndAbs = mustEndAbs || result.host && srcPath.length;
      if (mustEndAbs && !isAbsolute) {
        srcPath.unshift("");
      }
      if (!srcPath.length) {
        result.pathname = null;
        result.path = null;
      } else {
        result.pathname = srcPath.join("/");
      }
      if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
        result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
      }
      result.auth = relative.auth || result.auth;
      result.slashes = result.slashes || relative.slashes;
      result.href = result.format();
      return result;
    };
    Url.prototype.parseHost = function() {
      var host = this.host;
      var port = portPattern.exec(host);
      if (port) {
        port = port[0];
        if (port !== ":") {
          this.port = port.substr(1);
        }
        host = host.substr(0, host.length - port.length);
      }
      if (host)
        this.hostname = host;
    };
  }
});

// contracts/common/lib/jsonschema/helpers.js
var require_helpers = __commonJS({
  "contracts/common/lib/jsonschema/helpers.js"(exports, module) {
    "use strict";
    var uri = require_url();
    var ValidationError = exports.ValidationError = function ValidationError2(message, instance, schema, path3, name, argument) {
      if (Array.isArray(path3)) {
        this.path = path3;
        this.property = path3.reduce(function(sum2, item) {
          return sum2 + makeSuffix(item);
        }, "instance");
      } else if (path3 !== void 0) {
        this.property = path3;
      }
      if (message) {
        this.message = message;
      }
      if (schema) {
        var id = schema.$id || schema.id;
        this.schema = id || schema;
      }
      if (instance !== void 0) {
        this.instance = instance;
      }
      this.name = name;
      this.argument = argument;
      this.stack = this.toString();
    };
    ValidationError.prototype.toString = function toString4() {
      return this.property + " " + this.message;
    };
    var ValidatorResult = exports.ValidatorResult = function ValidatorResult2(instance, schema, options, ctx) {
      this.instance = instance;
      this.schema = schema;
      this.options = options;
      this.path = ctx.path;
      this.propertyPath = ctx.propertyPath;
      this.errors = [];
      this.throwError = options && options.throwError;
      this.throwFirst = options && options.throwFirst;
      this.throwAll = options && options.throwAll;
      this.disableFormat = options && options.disableFormat === true;
    };
    ValidatorResult.prototype.addError = function addError(detail) {
      var err2;
      if (typeof detail == "string") {
        err2 = new ValidationError(detail, this.instance, this.schema, this.path);
      } else {
        if (!detail)
          throw new Error("Missing error detail");
        if (!detail.message)
          throw new Error("Missing error message");
        if (!detail.name)
          throw new Error("Missing validator type");
        err2 = new ValidationError(
          detail.message,
          this.instance,
          this.schema,
          this.path,
          detail.name,
          detail.argument
        );
      }
      this.errors.push(err2);
      if (this.throwFirst) {
        throw new ValidatorResultError(this);
      } else if (this.throwError) {
        throw err2;
      }
      return err2;
    };
    ValidatorResult.prototype.importErrors = function importErrors(res) {
      if (typeof res == "string" || res && res.validatorType) {
        this.addError(res);
      } else if (res && res.errors) {
        this.errors = this.errors.concat(res.errors);
      }
    };
    function stringizer(v, i) {
      return i + ": " + v.toString() + "\n";
    }
    ValidatorResult.prototype.toString = function toString4(res) {
      return this.errors.map(stringizer).join("");
    };
    Object.defineProperty(ValidatorResult.prototype, "valid", {
      get: function() {
        return !this.errors.length;
      }
    });
    module.exports.ValidatorResultError = ValidatorResultError;
    function ValidatorResultError(result) {
      if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, ValidatorResultError);
      }
      this.instance = result.instance;
      this.schema = result.schema;
      this.options = result.options;
      this.errors = result.errors;
    }
    ValidatorResultError.prototype = new Error();
    ValidatorResultError.prototype.constructor = ValidatorResultError;
    ValidatorResultError.prototype.name = "Validation Error";
    var SchemaError = exports.SchemaError = function SchemaError2(msg, schema) {
      this.message = msg;
      this.schema = schema;
      Error.call(this, msg);
      if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, SchemaError2);
      }
    };
    SchemaError.prototype = Object.create(Error.prototype, {
      constructor: { value: SchemaError, enumerable: false },
      name: { value: "SchemaError", enumerable: false }
    });
    var SchemaContext = exports.SchemaContext = function SchemaContext2(schema, options, path3, base, schemas) {
      this.schema = schema;
      this.options = options;
      if (Array.isArray(path3)) {
        this.path = path3;
        this.propertyPath = path3.reduce(function(sum2, item) {
          return sum2 + makeSuffix(item);
        }, "instance");
      } else {
        this.propertyPath = path3;
      }
      this.base = base;
      this.schemas = schemas;
    };
    SchemaContext.prototype.resolve = function resolve(target) {
      return uri.resolve(this.base, target);
    };
    SchemaContext.prototype.makeChild = function makeChild(schema, propertyName) {
      var path3 = propertyName === void 0 ? this.path : this.path.concat([propertyName]);
      var id = schema.$id || schema.id;
      var base = uri.resolve(this.base, id || "");
      var ctx = new SchemaContext(
        schema,
        this.options,
        path3,
        base,
        Object.create(this.schemas)
      );
      if (id && !ctx.schemas[base]) {
        ctx.schemas[base] = schema;
      }
      return ctx;
    };
    var FORMAT_REGEXPS = exports.FORMAT_REGEXPS = {
      "date-time": /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])[tT ](2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])(\.\d+)?([zZ]|[+-]([0-5][0-9]):(60|[0-5][0-9]))$/,
      date: /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])$/,
      time: /^(2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])$/,
      duration: /P(T\d+(H(\d+M(\d+S)?)?|M(\d+S)?|S)|\d+(D|M(\d+D)?|Y(\d+M(\d+D)?)?)(T\d+(H(\d+M(\d+S)?)?|M(\d+S)?|S))?|\d+W)/i,
      email: /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/,
      "idn-email": /^("(?:[!#-\[\]-\u{10FFFF}]|\\[\t -\u{10FFFF}])*"|[!#-'*+\-/-9=?A-Z\^-\u{10FFFF}](?:\.?[!#-'*+\-/-9=?A-Z\^-\u{10FFFF}])*)@([!#-'*+\-/-9=?A-Z\^-\u{10FFFF}](?:\.?[!#-'*+\-/-9=?A-Z\^-\u{10FFFF}])*|\[[!-Z\^-\u{10FFFF}]*\])$/u,
      "ip-address": /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      ipv6: /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
      uri: /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/,
      "uri-reference": /^(((([A-Za-z][+\-.0-9A-Za-z]*(:%[0-9A-Fa-f]{2}|:[!$&-.0-;=?-Z_a-z~]|[/?])|\?)(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*|([A-Za-z][+\-.0-9A-Za-z]*:?)?)|([A-Za-z][+\-.0-9A-Za-z]*:)?\/((%[0-9A-Fa-f]{2}|\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~])+|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~]+)?|[.0-:A-Fa-f]+)\])?)(:\d*)?[/?]|[!$&-.0-;=?-Z_a-z~])(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*|(\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~])+|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~]+)?|[.0-:A-Fa-f]+)\])?)(:\d*)?)?))#(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*|(([A-Za-z][+\-.0-9A-Za-z]*)?%[0-9A-Fa-f]{2}|[!$&-.0-9;=@_~]|[A-Za-z][+\-.0-9A-Za-z]*[!$&-*,;=@_~])(%[0-9A-Fa-f]{2}|[!$&-.0-9;=@-Z_a-z~])*((([/?](%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*)?#|[/?])(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*)?|([A-Za-z][+\-.0-9A-Za-z]*(:%[0-9A-Fa-f]{2}|:[!$&-.0-;=?-Z_a-z~]|[/?])|\?)(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*|([A-Za-z][+\-.0-9A-Za-z]*:)?\/((%[0-9A-Fa-f]{2}|\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~])+|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~]+)?|[.0-:A-Fa-f]+)\])?)(:\d*)?[/?]|[!$&-.0-;=?-Z_a-z~])(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~])*|\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~])+(:\d*)?|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~]+)?|[.0-:A-Fa-f]+)\])?:\d*|\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~]+)?|[.0-:A-Fa-f]+)\])?)?|[A-Za-z][+\-.0-9A-Za-z]*:?)?$/,
      iri: /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/,
      "iri-reference": /^(((([A-Za-z][+\-.0-9A-Za-z]*(:%[0-9A-Fa-f]{2}|:[!$&-.0-;=?-Z_a-z~-\u{10FFFF}]|[/?])|\?)(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*|([A-Za-z][+\-.0-9A-Za-z]*:?)?)|([A-Za-z][+\-.0-9A-Za-z]*:)?\/((%[0-9A-Fa-f]{2}|\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~-\u{10FFFF}])+|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~-\u{10FFFF}]+)?|[.0-:A-Fa-f]+)\])?)(:\d*)?[/?]|[!$&-.0-;=?-Z_a-z~-\u{10FFFF}])(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*|(\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~-\u{10FFFF}])+|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~-\u{10FFFF}]+)?|[.0-:A-Fa-f]+)\])?)(:\d*)?)?))#(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*|(([A-Za-z][+\-.0-9A-Za-z]*)?%[0-9A-Fa-f]{2}|[!$&-.0-9;=@_~-\u{10FFFF}]|[A-Za-z][+\-.0-9A-Za-z]*[!$&-*,;=@_~-\u{10FFFF}])(%[0-9A-Fa-f]{2}|[!$&-.0-9;=@-Z_a-z~-\u{10FFFF}])*((([/?](%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*)?#|[/?])(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*)?|([A-Za-z][+\-.0-9A-Za-z]*(:%[0-9A-Fa-f]{2}|:[!$&-.0-;=?-Z_a-z~-\u{10FFFF}]|[/?])|\?)(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*|([A-Za-z][+\-.0-9A-Za-z]*:)?\/((%[0-9A-Fa-f]{2}|\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~-\u{10FFFF}])+|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~-\u{10FFFF}]+)?|[.0-:A-Fa-f]+)\])?)(:\d*)?[/?]|[!$&-.0-;=?-Z_a-z~-\u{10FFFF}])(%[0-9A-Fa-f]{2}|[!$&-;=?-Z_a-z~-\u{10FFFF}])*|\/((%[0-9A-Fa-f]{2}|[!$&-.0-9;=A-Z_a-z~-\u{10FFFF}])+(:\d*)?|(\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~-\u{10FFFF}]+)?|[.0-:A-Fa-f]+)\])?:\d*|\[(([Vv][0-9A-Fa-f]+\.[!$&-.0-;=A-Z_a-z~-\u{10FFFF}]+)?|[.0-:A-Fa-f]+)\])?)?|[A-Za-z][+\-.0-9A-Za-z]*:?)?$/u,
      uuid: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i,
      "uri-template": /(%[0-9a-f]{2}|[!#$&(-;=?@\[\]_a-z~]|\{[!#&+,./;=?@|]?(%[0-9a-f]{2}|[0-9_a-z])(\.?(%[0-9a-f]{2}|[0-9_a-z]))*(:[1-9]\d{0,3}|\*)?(,(%[0-9a-f]{2}|[0-9_a-z])(\.?(%[0-9a-f]{2}|[0-9_a-z]))*(:[1-9]\d{0,3}|\*)?)*\})*/iu,
      "json-pointer": /^(\/([\x00-\x2e0-@\[-}\x7f]|~[01])*)*$/iu,
      "relative-json-pointer": /^\d+(#|(\/([\x00-\x2e0-@\[-}\x7f]|~[01])*)*)$/iu,
      hostname: /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
      "host-name": /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
      "utc-millisec": function(input) {
        return typeof input === "string" && parseFloat(input) === parseInt(input, 10) && !isNaN(input);
      },
      regex: function(input) {
        var result = true;
        try {
          new RegExp(input);
        } catch (e) {
          result = false;
        }
        return result;
      },
      style: /[\r\n\t ]*[^\r\n\t ][^:]*:[\r\n\t ]*[^\r\n\t ;]*[\r\n\t ]*;?/,
      color: /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/,
      phone: /^\+(?:[0-9] ?){6,14}[0-9]$/,
      alpha: /^[a-zA-Z]+$/,
      alphanumeric: /^[a-zA-Z0-9]+$/
    };
    FORMAT_REGEXPS.regexp = FORMAT_REGEXPS.regex;
    FORMAT_REGEXPS.pattern = FORMAT_REGEXPS.regex;
    FORMAT_REGEXPS.ipv4 = FORMAT_REGEXPS["ip-address"];
    exports.isFormat = function isFormat(input, format, validator5) {
      if (typeof input === "string" && FORMAT_REGEXPS[format] !== void 0) {
        if (FORMAT_REGEXPS[format] instanceof RegExp) {
          return FORMAT_REGEXPS[format].test(input);
        }
        if (typeof FORMAT_REGEXPS[format] === "function") {
          return FORMAT_REGEXPS[format](input);
        }
      } else if (validator5 && validator5.customFormats && typeof validator5.customFormats[format] === "function") {
        return validator5.customFormats[format](input);
      }
      return true;
    };
    var makeSuffix = exports.makeSuffix = function makeSuffix2(key) {
      key = key.toString();
      if (!key.match(/[.\s\[\]]/) && !key.match(/^[\d]/)) {
        return "." + key;
      }
      if (key.match(/^\d+$/)) {
        return "[" + key + "]";
      }
      return "[" + JSON.stringify(key) + "]";
    };
    exports.deepCompareStrict = function deepCompareStrict(a, b) {
      if (typeof a !== typeof b) {
        return false;
      }
      if (Array.isArray(a)) {
        if (!Array.isArray(b)) {
          return false;
        }
        if (a.length !== b.length) {
          return false;
        }
        return a.every(function(v, i) {
          return deepCompareStrict(a[i], b[i]);
        });
      }
      if (typeof a === "object") {
        if (!a || !b) {
          return a === b;
        }
        var aKeys = Object.keys(a);
        var bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) {
          return false;
        }
        return aKeys.every(function(v) {
          return deepCompareStrict(a[v], b[v]);
        });
      }
      return a === b;
    };
    function deepMerger(target, dst, e, i) {
      if (typeof e === "object") {
        dst[i] = deepMerge(target[i], e);
      } else {
        if (target.indexOf(e) === -1) {
          dst.push(e);
        }
      }
    }
    function copyist(src, dst, key) {
      dst[key] = src[key];
    }
    function copyistWithDeepMerge(target, src, dst, key) {
      if (typeof src[key] !== "object" || !src[key]) {
        dst[key] = src[key];
      } else {
        if (!target[key]) {
          dst[key] = src[key];
        } else {
          dst[key] = deepMerge(target[key], src[key]);
        }
      }
    }
    function deepMerge(target, src) {
      var array = Array.isArray(src);
      var dst = array && [] || {};
      if (array) {
        target = target || [];
        dst = dst.concat(target);
        src.forEach(deepMerger.bind(null, target, dst));
      } else {
        if (target && typeof target === "object") {
          Object.keys(target).forEach(copyist.bind(null, target, dst));
        }
        Object.keys(src).forEach(copyistWithDeepMerge.bind(null, target, src, dst));
      }
      return dst;
    }
    module.exports.deepMerge = deepMerge;
    exports.objectGetPath = function objectGetPath(o3, s) {
      var parts = s.split("/").slice(1);
      var k;
      while (typeof (k = parts.shift()) == "string") {
        var n2 = decodeURIComponent(k.replace(/~0/, "~").replace(/~1/g, "/"));
        if (!(n2 in o3))
          return;
        o3 = o3[n2];
      }
      return o3;
    };
    function pathEncoder(v) {
      return "/" + encodeURIComponent(v).replace(/~/g, "%7E");
    }
    exports.encodePath = function encodePointer(a) {
      return a.map(pathEncoder).join("");
    };
    exports.getDecimalPlaces = function getDecimalPlaces(number) {
      var decimalPlaces = 0;
      if (isNaN(number))
        return decimalPlaces;
      if (typeof number !== "number") {
        number = Number(number);
      }
      var parts = number.toString().split("e");
      if (parts.length === 2) {
        if (parts[1][0] !== "-") {
          return decimalPlaces;
        } else {
          decimalPlaces = Number(parts[1].slice(1));
        }
      }
      var decimalParts = parts[0].split(".");
      if (decimalParts.length === 2) {
        decimalPlaces += decimalParts[1].length;
      }
      return decimalPlaces;
    };
    exports.isSchema = function isSchema(val) {
      return typeof val === "object" && val || typeof val === "boolean";
    };
  }
});

// contracts/common/lib/jsonschema/attribute.js
var require_attribute = __commonJS({
  "contracts/common/lib/jsonschema/attribute.js"(exports, module) {
    "use strict";
    var helpers = require_helpers();
    var ValidatorResult = helpers.ValidatorResult;
    var SchemaError = helpers.SchemaError;
    var attribute = {};
    attribute.ignoreProperties = {
      "id": true,
      "default": true,
      "description": true,
      "title": true,
      "additionalItems": true,
      "then": true,
      "else": true,
      "$schema": true,
      "$ref": true,
      "extends": true
  };
    var validators = attribute.validators = {};
    validators.type = function validateType(instance, schema, options, ctx) {
      if (instance === void 0) {
        return null;
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      var types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (!types.some(this.testType.bind(this, instance, schema, options, ctx))) {
        var list = types.map(function(v) {
          if (!v)
            return;
          var id = v.$id || v.id;
          return id ? "<" + id + ">" : v + "";
        });
        result.addError({
          name: "type",
          argument: list,
          message: "is not of a type(s) " + list
        });
      }
      return result;
    };
    function testSchemaNoThrow(instance, options, ctx, callback, schema) {
      var throwError = options.throwError;
      var throwAll = options.throwAll;
      options.throwError = false;
      options.throwAll = false;
      var res = this.validateSchema(instance, schema, options, ctx);
      options.throwError = throwError;
      options.throwAll = throwAll;
      if (!res.valid && callback instanceof Function) {
        callback(res);
      }
      return res.valid;
    }
    validators.anyOf = function validateAnyOf(instance, schema, options, ctx) {
      if (instance === void 0) {
        return null;
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      var inner = new ValidatorResult(instance, schema, options, ctx);
      if (!Array.isArray(schema.anyOf)) {
        throw new SchemaError("anyOf must be an array");
      }
      if (!schema.anyOf.some(
        testSchemaNoThrow.bind(
          this,
          instance,
          options,
          ctx,
          function(res) {
            inner.importErrors(res);
          }
        )
      )) {
        var list = schema.anyOf.map(function(v, i) {
          var id = v.$id || v.id;
          if (id)
            return "<" + id + ">";
          return v.title && JSON.stringify(v.title) || v["$ref"] && "<" + v["$ref"] + ">" || "[subschema " + i + "]";
        });
        if (options.nestedErrors) {
          result.importErrors(inner);
        }
        result.addError({
          name: "anyOf",
          argument: list,
          message: "is not any of " + list.join(",")
        });
      }
      return result;
    };
    validators.allOf = function validateAllOf(instance, schema, options, ctx) {
      if (instance === void 0) {
        return null;
      }
      if (!Array.isArray(schema.allOf)) {
        throw new SchemaError("allOf must be an array");
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      var self = this;
      schema.allOf.forEach(function(v, i) {
        var valid = self.validateSchema(instance, v, options, ctx);
        if (!valid.valid) {
          var id = v.$id || v.id;
          var msg = id || v.title && JSON.stringify(v.title) || v["$ref"] && "<" + v["$ref"] + ">" || "[subschema " + i + "]";
          result.addError({
            name: "allOf",
            argument: { id: msg, length: valid.errors.length, valid },
            message: "does not match allOf schema " + msg + " with " + valid.errors.length + " error[s]:"
        });
          result.importErrors(valid);
        }
      });
      return result;
    };
    validators.oneOf = function validateOneOf(instance, schema, options, ctx) {
      if (instance === void 0) {
        return null;
      }
      if (!Array.isArray(schema.oneOf)) {
        throw new SchemaError("oneOf must be an array");
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      var inner = new ValidatorResult(instance, schema, options, ctx);
      var count2 = schema.oneOf.filter(
        testSchemaNoThrow.bind(
          this,
          instance,
          options,
          ctx,
          function(res) {
            inner.importErrors(res);
          }
        )
      ).length;
      var list = schema.oneOf.map(function(v, i) {
        var id = v.$id || v.id;
        return id || v.title && JSON.stringify(v.title) || v["$ref"] && "<" + v["$ref"] + ">" || "[subschema " + i + "]";
      });
      if (count2 !== 1) {
        if (options.nestedErrors) {
          result.importErrors(inner);
        }
        result.addError({
          name: "oneOf",
          argument: list,
          message: "is not exactly one from " + list.join(",")
        });
      }
      return result;
    };
    validators.if = function validateIf(instance, schema, options, ctx) {
      if (instance === void 0)
        return null;
      if (!helpers.isSchema(schema.if))
        throw new Error('Expected "if" keyword to be a schema');
      var ifValid = testSchemaNoThrow.call(this, instance, options, ctx, null, schema.if);
      var result = new ValidatorResult(instance, schema, options, ctx);
      var res;
      if (ifValid) {
        if (schema.then === void 0)
          return;
        if (!helpers.isSchema(schema.then))
          throw new Error('Expected "then" keyword to be a schema');
        res = this.validateSchema(instance, schema.then, options, ctx.makeChild(schema.then));
        result.importErrors(res);
      } else {
        if (schema.else === void 0)
          return;
        if (!helpers.isSchema(schema.else))
          throw new Error('Expected "else" keyword to be a schema');
        res = this.validateSchema(instance, schema.else, options, ctx.makeChild(schema.else));
        result.importErrors(res);
      }
      return result;
    };
    function getEnumerableProperty(object, key) {
      if (Object.hasOwnProperty.call(object, key))
        return object[key];
      if (!(key in object))
        return;
      while (object = Object.getPrototypeOf(object)) {
        if (Object.propertyIsEnumerable.call(object, key))
          return object[key];
      }
    }
    validators.propertyNames = function validatePropertyNames(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var subschema = schema.propertyNames !== void 0 ? schema.propertyNames : {};
      if (!helpers.isSchema(subschema))
        throw new SchemaError('Expected "propertyNames" to be a schema (object or boolean)');
      for (var property in instance) {
        if (getEnumerableProperty(instance, property) !== void 0) {
          var res = this.validateSchema(property, subschema, options, ctx.makeChild(subschema));
          result.importErrors(res);
        }
      }
      return result;
    };
    validators.properties = function validateProperties(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var properties = schema.properties || {};
      for (var property in properties) {
        var subschema = properties[property];
        if (subschema === void 0) {
          continue;
        } else if (subschema === null) {
          throw new SchemaError('Unexpected null, expected schema in "properties"');
        }
        if (typeof options.preValidateProperty == "function") {
          options.preValidateProperty(instance, property, subschema, options, ctx);
        }
        var prop4 = getEnumerableProperty(instance, property);
        var res = this.validateSchema(prop4, subschema, options, ctx.makeChild(subschema, property));
        if (res.instance !== result.instance[property])
          result.instance[property] = res.instance;
        result.importErrors(res);
      }
      return result;
    };
    function testAdditionalProperty(instance, schema, options, ctx, property, result) {
      if (!this.types.object(instance))
        return;
      if (schema.properties && schema.properties[property] !== void 0) {
        return;
      }
      if (schema.additionalProperties === false) {
        result.addError({
          name: "additionalProperties",
          argument: property,
          message: "is not allowed to have the additional property " + JSON.stringify(property)
        });
      } else {
        var additionalProperties = schema.additionalProperties || {};
        if (typeof options.preValidateProperty == "function") {
          options.preValidateProperty(instance, property, additionalProperties, options, ctx);
        }
        var res = this.validateSchema(instance[property], additionalProperties, options, ctx.makeChild(additionalProperties, property));
        if (res.instance !== result.instance[property])
          result.instance[property] = res.instance;
        result.importErrors(res);
      }
    }
    validators.patternProperties = function validatePatternProperties(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var patternProperties = schema.patternProperties || {};
      for (var property in instance) {
        var test3 = true;
        for (var pattern in patternProperties) {
          var subschema = patternProperties[pattern];
          if (subschema === void 0) {
            continue;
          } else if (subschema === null) {
            throw new SchemaError('Unexpected null, expected schema in "patternProperties"');
          }
          try {
            var regexp = new RegExp(pattern, "u");
          } catch (_e) {
            regexp = new RegExp(pattern);
          }
          if (!regexp.test(property)) {
            continue;
          }
          test3 = false;
          if (typeof options.preValidateProperty == "function") {
            options.preValidateProperty(instance, property, subschema, options, ctx);
          }
          var res = this.validateSchema(instance[property], subschema, options, ctx.makeChild(subschema, property));
          if (res.instance !== result.instance[property])
            result.instance[property] = res.instance;
          result.importErrors(res);
        }
        if (test3) {
          testAdditionalProperty.call(this, instance, schema, options, ctx, property, result);
        }
      }
      return result;
    };
    validators.additionalProperties = function validateAdditionalProperties(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      if (schema.patternProperties) {
        return null;
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      for (var property in instance) {
        testAdditionalProperty.call(this, instance, schema, options, ctx, property, result);
      }
      return result;
    };
    validators.minProperties = function validateMinProperties(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var keys6 = Object.keys(instance);
      if (!(keys6.length >= schema.minProperties)) {
        result.addError({
          name: "minProperties",
          argument: schema.minProperties,
          message: "does not meet minimum property length of " + schema.minProperties
        });
      }
      return result;
    };
    validators.maxProperties = function validateMaxProperties(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var keys6 = Object.keys(instance);
      if (!(keys6.length <= schema.maxProperties)) {
        result.addError({
          name: "maxProperties",
          argument: schema.maxProperties,
          message: "does not meet maximum property length of " + schema.maxProperties
        });
      }
      return result;
    };
    validators.items = function validateItems(instance, schema, options, ctx) {
      var self = this;
      if (!this.types.array(instance))
        return;
      if (schema.items === void 0)
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      instance.every(function(value, i) {
        if (Array.isArray(schema.items)) {
          var items = schema.items[i] === void 0 ? schema.additionalItems : schema.items[i];
        } else {
          var items = schema.items;
        }
        if (items === void 0) {
          return true;
        }
        if (items === false) {
          result.addError({
            name: "items",
            message: "additionalItems not permitted"
          });
          return false;
        }
        var res = self.validateSchema(value, items, options, ctx.makeChild(items, i));
        if (res.instance !== result.instance[i])
          result.instance[i] = res.instance;
        result.importErrors(res);
        return true;
      });
      return result;
    };
    validators.contains = function validateContains(instance, schema, options, ctx) {
      var self = this;
      if (!this.types.array(instance))
        return;
      if (schema.contains === void 0)
        return;
      if (!helpers.isSchema(schema.contains))
        throw new Error('Expected "contains" keyword to be a schema');
      var result = new ValidatorResult(instance, schema, options, ctx);
      var count2 = instance.some(function(value, i) {
        var res = self.validateSchema(value, schema.contains, options, ctx.makeChild(schema.contains, i));
        return res.errors.length === 0;
      });
      if (count2 === false) {
        result.addError({
          name: "contains",
          argument: schema.contains,
          message: "must contain an item matching given schema"
        });
      }
      return result;
    };
    validators.minimum = function validateMinimum(instance, schema, options, ctx) {
      if (!this.types.number(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (schema.exclusiveMinimum && schema.exclusiveMinimum === true) {
        if (!(instance > schema.minimum)) {
          result.addError({
            name: "minimum",
            argument: schema.minimum,
            message: "must be greater than " + schema.minimum
          });
        }
      } else {
        if (!(instance >= schema.minimum)) {
          result.addError({
            name: "minimum",
            argument: schema.minimum,
            message: "must be greater than or equal to " + schema.minimum
          });
        }
      }
      return result;
    };
    validators.maximum = function validateMaximum(instance, schema, options, ctx) {
      if (!this.types.number(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (schema.exclusiveMaximum && schema.exclusiveMaximum === true) {
        if (!(instance < schema.maximum)) {
          result.addError({
            name: "maximum",
            argument: schema.maximum,
            message: "must be less than " + schema.maximum
          });
        }
      } else {
        if (!(instance <= schema.maximum)) {
          result.addError({
            name: "maximum",
            argument: schema.maximum,
            message: "must be less than or equal to " + schema.maximum
          });
        }
      }
      return result;
    };
    validators.exclusiveMinimum = function validateExclusiveMinimum(instance, schema, options, ctx) {
      if (typeof schema.exclusiveMinimum === "boolean")
      return;
      if (!this.types.number(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var valid = instance > schema.exclusiveMinimum;
      if (!valid) {
        result.addError({
          name: "exclusiveMinimum",
          argument: schema.exclusiveMinimum,
          message: "must be strictly greater than " + schema.exclusiveMinimum
        });
      }
      return result;
    };
    validators.exclusiveMaximum = function validateExclusiveMaximum(instance, schema, options, ctx) {
      if (typeof schema.exclusiveMaximum === "boolean")
      return;
      if (!this.types.number(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var valid = instance < schema.exclusiveMaximum;
      if (!valid) {
        result.addError({
          name: "exclusiveMaximum",
          argument: schema.exclusiveMaximum,
          message: "must be strictly less than " + schema.exclusiveMaximum
        });
      }
      return result;
    };
    var validateMultipleOfOrDivisbleBy = function validateMultipleOfOrDivisbleBy2(instance, schema, options, ctx, validationType, errorMessage) {
      if (!this.types.number(instance))
        return;
      var validationArgument = schema[validationType];
      if (validationArgument == 0) {
        throw new SchemaError(validationType + " cannot be zero");
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      var instanceDecimals = helpers.getDecimalPlaces(instance);
      var divisorDecimals = helpers.getDecimalPlaces(validationArgument);
      var maxDecimals = Math.max(instanceDecimals, divisorDecimals);
      var multiplier = Math.pow(10, maxDecimals);
      if (Math.round(instance * multiplier) % Math.round(validationArgument * multiplier) !== 0) {
        result.addError({
          name: validationType,
          argument: validationArgument,
          message: errorMessage + JSON.stringify(validationArgument)
        });
      }
      return result;
    };
    validators.multipleOf = function validateMultipleOf(instance, schema, options, ctx) {
      return validateMultipleOfOrDivisbleBy.call(this, instance, schema, options, ctx, "multipleOf", "is not a multiple of (divisible by) ");
    };
    validators.divisibleBy = function validateDivisibleBy(instance, schema, options, ctx) {
      return validateMultipleOfOrDivisbleBy.call(this, instance, schema, options, ctx, "divisibleBy", "is not divisible by (multiple of) ");
    };
    validators.required = function validateRequired(instance, schema, options, ctx) {
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (instance === void 0 && schema.required === true) {
        result.addError({
          name: "required",
          message: "is required"
        });
      } else if (this.types.object(instance) && Array.isArray(schema.required)) {
        schema.required.forEach(function(n2) {
          if (getEnumerableProperty(instance, n2) === void 0) {
            result.addError({
              name: "required",
              argument: n2,
              message: "requires property " + JSON.stringify(n2)
            });
          }
        });
      }
      return result;
    };
    validators.pattern = function validatePattern(instance, schema, options, ctx) {
      if (!this.types.string(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var pattern = schema.pattern;
      try {
        var regexp = new RegExp(pattern, "u");
      } catch (_e) {
        regexp = new RegExp(pattern);
      }
      if (!instance.match(regexp)) {
        result.addError({
          name: "pattern",
          argument: schema.pattern,
          message: "does not match pattern " + JSON.stringify(schema.pattern.toString())
        });
      }
      return result;
    };
    validators.format = function validateFormat(instance, schema, options, ctx) {
      if (instance === void 0)
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (!result.disableFormat && !helpers.isFormat(instance, schema.format, this)) {
        result.addError({
          name: "format",
          argument: schema.format,
          message: "does not conform to the " + JSON.stringify(schema.format) + " format"
        });
      }
      return result;
    };
    validators.minLength = function validateMinLength(instance, schema, options, ctx) {
      if (!this.types.string(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var hsp = instance.match(/[\uDC00-\uDFFF]/g);
      var length3 = instance.length - (hsp ? hsp.length : 0);
      if (!(length3 >= schema.minLength)) {
        result.addError({
          name: "minLength",
          argument: schema.minLength,
          message: "does not meet minimum length of " + schema.minLength
        });
      }
      return result;
    };
    validators.maxLength = function validateMaxLength(instance, schema, options, ctx) {
      if (!this.types.string(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var hsp = instance.match(/[\uDC00-\uDFFF]/g);
      var length3 = instance.length - (hsp ? hsp.length : 0);
      if (!(length3 <= schema.maxLength)) {
        result.addError({
          name: "maxLength",
          argument: schema.maxLength,
          message: "does not meet maximum length of " + schema.maxLength
        });
      }
      return result;
    };
    validators.minItems = function validateMinItems(instance, schema, options, ctx) {
      if (!this.types.array(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (!(instance.length >= schema.minItems)) {
        result.addError({
          name: "minItems",
          argument: schema.minItems,
          message: "does not meet minimum length of " + schema.minItems
        });
      }
      return result;
    };
    validators.maxItems = function validateMaxItems(instance, schema, options, ctx) {
      if (!this.types.array(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (!(instance.length <= schema.maxItems)) {
        result.addError({
          name: "maxItems",
          argument: schema.maxItems,
          message: "does not meet maximum length of " + schema.maxItems
        });
      }
      return result;
    };
    function testArrays(v, i, a) {
      var j, len = a.length;
      for (j = i + 1, len; j < len; j++) {
        if (helpers.deepCompareStrict(v, a[j])) {
          return false;
        }
      }
      return true;
    }
    validators.uniqueItems = function validateUniqueItems(instance, schema, options, ctx) {
      if (schema.uniqueItems !== true)
        return;
      if (!this.types.array(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (!instance.every(testArrays)) {
        result.addError({
          name: "uniqueItems",
          message: "contains duplicate item"
        });
      }
      return result;
    };
    validators.dependencies = function validateDependencies(instance, schema, options, ctx) {
      if (!this.types.object(instance))
        return;
      var result = new ValidatorResult(instance, schema, options, ctx);
      for (var property in schema.dependencies) {
        if (instance[property] === void 0) {
          continue;
        }
        var dep = schema.dependencies[property];
        var childContext = ctx.makeChild(dep, property);
        if (typeof dep == "string") {
          dep = [dep];
        }
        if (Array.isArray(dep)) {
          dep.forEach(function(prop4) {
            if (instance[prop4] === void 0) {
              result.addError({
                name: "dependencies",
                argument: childContext.propertyPath,
                message: "property " + prop4 + " not found, required by " + childContext.propertyPath
              });
            }
          });
        } else {
          var res = this.validateSchema(instance, dep, options, childContext);
          if (result.instance !== res.instance)
            result.instance = res.instance;
          if (res && res.errors.length) {
            result.addError({
              name: "dependencies",
              argument: childContext.propertyPath,
              message: "does not meet dependency required by " + childContext.propertyPath
            });
            result.importErrors(res);
          }
        }
      }
      return result;
    };
    validators["enum"] = function validateEnum(instance, schema, options, ctx) {
      if (instance === void 0) {
        return null;
      }
      if (!Array.isArray(schema["enum"])) {
        throw new SchemaError("enum expects an array", schema);
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (!schema["enum"].some(helpers.deepCompareStrict.bind(null, instance))) {
        result.addError({
          name: "enum",
          argument: schema["enum"],
        message: "is not one of enum values: " + schema["enum"].map(String).join(",")
      });
      }
      return result;
    };
    validators["const"] = function validateEnum(instance, schema, options, ctx) {
      if (instance === void 0) {
        return null;
      }
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (!helpers.deepCompareStrict(schema["const"], instance)) {
        result.addError({
          name: "const",
          argument: schema["const"],
        message: "does not exactly match expected constant: " + schema["const"]
      });
      }
      return result;
    };
    validators.not = validators.disallow = function validateNot(instance, schema, options, ctx) {
      var self = this;
      if (instance === void 0)
        return null;
      var result = new ValidatorResult(instance, schema, options, ctx);
      var notTypes = schema.not || schema.disallow;
      if (!notTypes)
        return null;
      if (!Array.isArray(notTypes))
        notTypes = [notTypes];
      notTypes.forEach(function(type3) {
        if (self.testType(instance, schema, options, ctx, type3)) {
          var id = type3 && (type3.$id || type3.id);
          var schemaId = id || type3;
          result.addError({
            name: "not",
            argument: schemaId,
            message: "is of prohibited type " + schemaId
          });
        }
      });
      return result;
    };
    module.exports = attribute;
  }
});

// contracts/common/lib/jsonschema/scan.js
var require_scan = __commonJS({
  "contracts/common/lib/jsonschema/scan.js"(exports, module) {
    "use strict";
    var urilib = require_url();
    var helpers = require_helpers();
    module.exports.SchemaScanResult = SchemaScanResult;
    function SchemaScanResult(found, ref) {
      this.id = found;
      this.ref = ref;
    }
    module.exports.scan = function scan3(base, schema) {
      function scanSchema(baseuri, schema2) {
        if (!schema2 || typeof schema2 != "object")
        return;
        if (schema2.$ref) {
          var resolvedUri = urilib.resolve(baseuri, schema2.$ref);
          ref[resolvedUri] = ref[resolvedUri] ? ref[resolvedUri] + 1 : 0;
          return;
        }
        var id = schema2.$id || schema2.id;
        var ourBase = id ? urilib.resolve(baseuri, id) : baseuri;
        if (ourBase) {
          if (ourBase.indexOf("#") < 0)
          ourBase += "#";
          if (found[ourBase]) {
            if (!helpers.deepCompareStrict(found[ourBase], schema2)) {
              throw new Error(
                "Schema <" + ourBase + "> already exists with different definition"
            );
            }
            return found[ourBase];
          }
          found[ourBase] = schema2;
          if (ourBase[ourBase.length - 1] == "#") {
            found[ourBase.substring(0, ourBase.length - 1)] = schema2;
          }
        }
        scanArray(
          ourBase + "/items",
          Array.isArray(schema2.items) ? schema2.items : [schema2.items]
      );
        scanArray(
          ourBase + "/extends",
          Array.isArray(schema2.extends) ? schema2.extends : [schema2.extends]
      );
        scanSchema(ourBase + "/additionalItems", schema2.additionalItems);
        scanObject(ourBase + "/properties", schema2.properties);
        scanSchema(ourBase + "/additionalProperties", schema2.additionalProperties);
        scanObject(ourBase + "/definitions", schema2.definitions);
        scanObject(ourBase + "/patternProperties", schema2.patternProperties);
        scanObject(ourBase + "/dependencies", schema2.dependencies);
        scanArray(ourBase + "/disallow", schema2.disallow);
        scanArray(ourBase + "/allOf", schema2.allOf);
        scanArray(ourBase + "/anyOf", schema2.anyOf);
        scanArray(ourBase + "/oneOf", schema2.oneOf);
        scanSchema(ourBase + "/not", schema2.not);
      }
      function scanArray(baseuri, schemas) {
        if (!Array.isArray(schemas))
          return;
        for (var i = 0; i < schemas.length; i++) {
          scanSchema(baseuri + "/" + i, schemas[i]);
        }
      }
      function scanObject(baseuri, schemas) {
        if (!schemas || typeof schemas != "object")
        return;
        for (var p in schemas) {
          scanSchema(baseuri + "/" + p, schemas[p]);
        }
      }
      var found = {};
      var ref = {};
      scanSchema(base, schema);
      return new SchemaScanResult(found, ref);
    };
  }
});

// contracts/common/lib/jsonschema/validator.js
var require_validator = __commonJS({
  "contracts/common/lib/jsonschema/validator.js"(exports, module) {
    "use strict";
    var urilib = require_url();
    var attribute = require_attribute();
    var helpers = require_helpers();
    var scanSchema = require_scan().scan;
    var ValidatorResult = helpers.ValidatorResult;
    var ValidatorResultError = helpers.ValidatorResultError;
    var SchemaError = helpers.SchemaError;
    var SchemaContext = helpers.SchemaContext;
    var anonymousBase = "/";
    var Validator = function Validator2() {
      this.customFormats = Object.create(Validator2.prototype.customFormats);
      this.schemas = {};
      this.unresolvedRefs = [];
      this.types = Object.create(types);
      this.attributes = Object.create(attribute.validators);
    };
    Validator.prototype.customFormats = {};
    Validator.prototype.schemas = null;
    Validator.prototype.types = null;
    Validator.prototype.attributes = null;
    Validator.prototype.unresolvedRefs = null;
    Validator.prototype.addSchema = function addSchema(schema, base) {
      var self = this;
      if (!schema) {
        return null;
      }
      var scan3 = scanSchema(base || anonymousBase, schema);
      var ourUri = base || schema.$id || schema.id;
      for (var uri in scan3.id) {
        this.schemas[uri] = scan3.id[uri];
      }
      for (var uri in scan3.ref) {
        this.unresolvedRefs.push(uri);
      }
      this.unresolvedRefs = this.unresolvedRefs.filter(function(uri2) {
        return typeof self.schemas[uri2] === "undefined";
      });
      return this.schemas[ourUri];
    };
    Validator.prototype.addSubSchemaArray = function addSubSchemaArray(baseuri, schemas) {
      if (!Array.isArray(schemas))
        return;
      for (var i = 0; i < schemas.length; i++) {
        this.addSubSchema(baseuri, schemas[i]);
      }
    };
    Validator.prototype.addSubSchemaObject = function addSubSchemaArray(baseuri, schemas) {
      if (!schemas || typeof schemas != "object")
      return;
      for (var p in schemas) {
        this.addSubSchema(baseuri, schemas[p]);
      }
    };
    Validator.prototype.setSchemas = function setSchemas(schemas) {
      this.schemas = schemas;
    };
    Validator.prototype.getSchema = function getSchema2(urn) {
      return this.schemas[urn];
    };
    Validator.prototype.validate = function validate2(instance, schema, options, ctx) {
      if (typeof schema !== "boolean" && typeof schema !== "object" || schema === null) {
        throw new SchemaError("Expected `schema` to be an object or boolean");
      }
      if (!options) {
        options = {};
      }
      var id = schema.$id || schema.id;
      var base = urilib.resolve(options.base || anonymousBase, id || "");
      if (!ctx) {
        ctx = new SchemaContext(
          schema,
          options,
          [],
          base,
          Object.create(this.schemas)
        );
        if (!ctx.schemas[base]) {
          ctx.schemas[base] = schema;
        }
        var found = scanSchema(base, schema);
        for (var n2 in found.id) {
          var sch = found.id[n2];
          ctx.schemas[n2] = sch;
        }
      }
      if (options.required && instance === void 0) {
        var result = new ValidatorResult(instance, schema, options, ctx);
        result.addError("is required, but is undefined");
        return result;
      }
      var result = this.validateSchema(instance, schema, options, ctx);
      if (!result) {
        throw new Error("Result undefined");
      } else if (options.throwAll && result.errors.length) {
        throw new ValidatorResultError(result);
      }
      return result;
    };
    function shouldResolve(schema) {
      var ref = typeof schema === "string" ? schema : schema.$ref;
      if (typeof ref == "string")
      return ref;
      return false;
    }
    Validator.prototype.validateSchema = function validateSchema2(instance, schema, options, ctx) {
      var result = new ValidatorResult(instance, schema, options, ctx);
      if (typeof schema === "boolean") {
        if (schema === true) {
          schema = {};
        } else if (schema === false) {
          schema = { type: [] };
        }
      } else if (!schema) {
        throw new Error("schema is undefined");
      }
      if (schema["extends"]) {
        if (Array.isArray(schema["extends"])) {
          var schemaobj = { schema, ctx };
          schema["extends"].forEach(this.schemaTraverser.bind(this, schemaobj));
          schema = schemaobj.schema;
          schemaobj.schema = null;
          schemaobj.ctx = null;
          schemaobj = null;
        } else {
          schema = helpers.deepMerge(
            schema,
            this.superResolve(schema["extends"], ctx)
        );
        }
      }
      var switchSchema = shouldResolve(schema);
      if (switchSchema) {
        var resolved = this.resolve(schema, switchSchema, ctx);
        var subctx = new SchemaContext(
          resolved.subschema,
          options,
          ctx.path,
          resolved.switchSchema,
          ctx.schemas
        );
        return this.validateSchema(instance, resolved.subschema, options, subctx);
      }
      var skipAttributes = options && options.skipAttributes || [];
      for (var key in schema) {
        if (!attribute.ignoreProperties[key] && skipAttributes.indexOf(key) < 0) {
          var validatorErr = null;
          var validator5 = this.attributes[key];
          if (validator5) {
            validatorErr = validator5.call(this, instance, schema, options, ctx);
          } else if (options.allowUnknownAttributes === false) {
            throw new SchemaError("Unsupported attribute: " + key, schema);
          }
          if (validatorErr) {
            result.importErrors(validatorErr);
          }
        }
      }
      if (typeof options.rewrite == "function") {
        var value = options.rewrite.call(this, instance, schema, options, ctx);
        result.instance = value;
      }
      return result;
    };
    Validator.prototype.schemaTraverser = function schemaTraverser(schemaobj, s) {
      schemaobj.schema = helpers.deepMerge(
        schemaobj.schema,
        this.superResolve(s, schemaobj.ctx)
      );
    };
    Validator.prototype.superResolve = function superResolve(schema, ctx) {
      var ref = shouldResolve(schema);
      if (ref) {
        return this.resolve(schema, ref, ctx).subschema;
      }
      return schema;
    };
    Validator.prototype.resolve = function resolve(schema, switchSchema, ctx) {
      switchSchema = ctx.resolve(switchSchema);
      if (ctx.schemas[switchSchema]) {
        return { subschema: ctx.schemas[switchSchema], switchSchema };
      }
      var parsed = urilib.parse(switchSchema);
      var fragment = parsed && parsed.hash;
      var document = fragment && fragment.length && switchSchema.substr(0, switchSchema.length - fragment.length);
      if (!document || !ctx.schemas[document]) {
        throw new SchemaError("no such schema <" + switchSchema + ">", schema);
      }
      var subschema = helpers.objectGetPath(
        ctx.schemas[document],
        fragment.substr(1)
      );
      if (subschema === void 0) {
        throw new SchemaError(
          "no such schema " + fragment + " located in <" + document + ">",
        schema
      );
      }
      return { subschema, switchSchema };
    };
    Validator.prototype.testType = function validateType(instance, schema, options, ctx, type3) {
      if (type3 === void 0) {
        return;
      } else if (type3 === null) {
        throw new SchemaError('Unexpected null in "type" keyword');
      }
      if (typeof this.types[type3] == "function") {
        return this.types[type3].call(this, instance);
      }
      if (type3 && typeof type3 == "object") {
        var res = this.validateSchema(instance, type3, options, ctx);
        return res === void 0 || !(res && res.errors.length);
      }
      return true;
    };
    var types = Validator.prototype.types = {};
    types.string = function testString(instance) {
      return typeof instance == "string";
    };
    types.number = function testNumber(instance) {
      return typeof instance == "number" && isFinite(instance);
    };
    types.integer = function testInteger(instance) {
      return typeof instance == "number" && instance % 1 === 0;
    };
    types.boolean = function testBoolean(instance) {
      return typeof instance == "boolean";
    };
    types.array = function testArray(instance) {
      return Array.isArray(instance);
    };
    types["null"] = function testNull(instance) {
      return instance === null;
    };
    types.date = function testDate(instance) {
      return instance instanceof Date;
    };
    types.any = function testAny(instance) {
      return true;
    };
    types.object = function testObject(instance) {
      return instance && typeof instance === "object" && !Array.isArray(instance) && !(instance instanceof Date);
    };
    module.exports = Validator;
  }
});

// contracts/common/lib/jsonschema/index.js
var require_jsonschema = __commonJS({
  "contracts/common/lib/jsonschema/index.js"(exports, module) {
    "use strict";
    var Validator = module.exports.Validator = require_validator();
    module.exports.ValidatorResult = require_helpers().ValidatorResult;
    module.exports.ValidatorResultError = require_helpers().ValidatorResultError;
    module.exports.ValidationError = require_helpers().ValidationError;
    module.exports.SchemaError = require_helpers().SchemaError;
    module.exports.SchemaScanResult = require_scan().SchemaScanResult;
    module.exports.scan = require_scan().scan;
    module.exports.validate = function(instance, schema, options) {
      var v = new Validator();
      return v.validate(instance, schema, options);
    };
  }
});

// node_modules/ramda/src/F.js
var require_F = __commonJS({
  "node_modules/ramda/src/F.js"(exports, module) {
    var F2 = function() {
      return false;
    };
    module.exports = F2;
  }
});

// node_modules/ramda/src/T.js
var require_T = __commonJS({
  "node_modules/ramda/src/T.js"(exports, module) {
    var T2 = function() {
      return true;
    };
    module.exports = T2;
  }
});

// node_modules/ramda/src/__.js
var require__ = __commonJS({
  "node_modules/ramda/src/__.js"(exports, module) {
    module.exports = {
      "@@functional/placeholder": true
    };
  }
});

// node_modules/ramda/src/internal/_isPlaceholder.js
var require_isPlaceholder = __commonJS({
  "node_modules/ramda/src/internal/_isPlaceholder.js"(exports, module) {
    function _isPlaceholder2(a) {
      return a != null && typeof a === "object" && a["@@functional/placeholder"] === true;
    }
    module.exports = _isPlaceholder2;
  }
});

// node_modules/ramda/src/internal/_curry1.js
var require_curry1 = __commonJS({
  "node_modules/ramda/src/internal/_curry1.js"(exports, module) {
    var _isPlaceholder2 = require_isPlaceholder();
    function _curry12(fn) {
      return function f1(a) {
        if (arguments.length === 0 || _isPlaceholder2(a)) {
          return f1;
        } else {
          return fn.apply(this, arguments);
        }
      };
    }
    module.exports = _curry12;
  }
});

// node_modules/ramda/src/internal/_curry2.js
var require_curry2 = __commonJS({
  "node_modules/ramda/src/internal/_curry2.js"(exports, module) {
    var _curry12 = require_curry1();
    var _isPlaceholder2 = require_isPlaceholder();
    function _curry22(fn) {
      return function f2(a, b) {
        switch (arguments.length) {
          case 0:
            return f2;
          case 1:
            return _isPlaceholder2(a) ? f2 : _curry12(function(_b) {
              return fn(a, _b);
            });
          default:
            return _isPlaceholder2(a) && _isPlaceholder2(b) ? f2 : _isPlaceholder2(a) ? _curry12(function(_a) {
              return fn(_a, b);
            }) : _isPlaceholder2(b) ? _curry12(function(_b) {
              return fn(a, _b);
            }) : fn(a, b);
        }
      };
    }
    module.exports = _curry22;
  }
});

// node_modules/ramda/src/add.js
var require_add = __commonJS({
  "node_modules/ramda/src/add.js"(exports, module) {
    var _curry22 = require_curry2();
    var add4 = /* @__PURE__ */ _curry22(function add5(a, b) {
      return Number(a) + Number(b);
    });
    module.exports = add4;
  }
});

// node_modules/ramda/src/internal/_concat.js
var require_concat = __commonJS({
  "node_modules/ramda/src/internal/_concat.js"(exports, module) {
    function _concat2(set1, set22) {
      set1 = set1 || [];
      set22 = set22 || [];
      var idx;
      var len1 = set1.length;
      var len2 = set22.length;
      var result = [];
      idx = 0;
      while (idx < len1) {
        result[result.length] = set1[idx];
        idx += 1;
      }
      idx = 0;
      while (idx < len2) {
        result[result.length] = set22[idx];
        idx += 1;
      }
      return result;
    }
    module.exports = _concat2;
  }
});

// node_modules/ramda/src/internal/_arity.js
var require_arity = __commonJS({
  "node_modules/ramda/src/internal/_arity.js"(exports, module) {
    function _arity2(n2, fn) {
      switch (n2) {
        case 0:
          return function() {
            return fn.apply(this, arguments);
          };
        case 1:
          return function(a0) {
            return fn.apply(this, arguments);
          };
        case 2:
          return function(a0, a1) {
            return fn.apply(this, arguments);
          };
        case 3:
          return function(a0, a1, a2) {
            return fn.apply(this, arguments);
          };
        case 4:
          return function(a0, a1, a2, a3) {
            return fn.apply(this, arguments);
          };
        case 5:
          return function(a0, a1, a2, a3, a4) {
            return fn.apply(this, arguments);
          };
        case 6:
          return function(a0, a1, a2, a3, a4, a5) {
            return fn.apply(this, arguments);
          };
        case 7:
          return function(a0, a1, a2, a3, a4, a5, a6) {
            return fn.apply(this, arguments);
          };
        case 8:
          return function(a0, a1, a2, a3, a4, a5, a6, a7) {
            return fn.apply(this, arguments);
          };
        case 9:
          return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
            return fn.apply(this, arguments);
          };
        case 10:
          return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            return fn.apply(this, arguments);
          };
        default:
          throw new Error("First argument to _arity must be a non-negative integer no greater than ten");
      }
    }
    module.exports = _arity2;
  }
});

// node_modules/ramda/src/internal/_curryN.js
var require_curryN = __commonJS({
  "node_modules/ramda/src/internal/_curryN.js"(exports, module) {
    var _arity2 = require_arity();
    var _isPlaceholder2 = require_isPlaceholder();
    function _curryN2(length3, received, fn) {
      return function() {
        var combined = [];
        var argsIdx = 0;
        var left = length3;
        var combinedIdx = 0;
        while (combinedIdx < received.length || argsIdx < arguments.length) {
          var result;
          if (combinedIdx < received.length && (!_isPlaceholder2(received[combinedIdx]) || argsIdx >= arguments.length)) {
            result = received[combinedIdx];
          } else {
            result = arguments[argsIdx];
            argsIdx += 1;
          }
          combined[combinedIdx] = result;
          if (!_isPlaceholder2(result)) {
            left -= 1;
          }
          combinedIdx += 1;
        }
        return left <= 0 ? fn.apply(this, combined) : _arity2(left, _curryN2(length3, combined, fn));
      };
    }
    module.exports = _curryN2;
  }
});

// node_modules/ramda/src/curryN.js
var require_curryN2 = __commonJS({
  "node_modules/ramda/src/curryN.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry12 = require_curry1();
    var _curry22 = require_curry2();
    var _curryN2 = require_curryN();
    var curryN3 = /* @__PURE__ */ _curry22(function curryN4(length3, fn) {
      if (length3 === 1) {
        return _curry12(fn);
      }
      return _arity2(length3, _curryN2(length3, [], fn));
    });
    module.exports = curryN3;
  }
});

// node_modules/ramda/src/addIndex.js
var require_addIndex = __commonJS({
  "node_modules/ramda/src/addIndex.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry12 = require_curry1();
    var curryN3 = require_curryN2();
    var addIndex5 = /* @__PURE__ */ _curry12(function addIndex6(fn) {
      return curryN3(fn.length, function() {
        var idx = 0;
        var origFn = arguments[0];
        var list = arguments[arguments.length - 1];
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = function() {
          var result = origFn.apply(this, _concat2(arguments, [idx, list]));
          idx += 1;
          return result;
        };
        return fn.apply(this, args);
      });
    });
    module.exports = addIndex5;
  }
});

// node_modules/ramda/src/internal/_curry3.js
var require_curry3 = __commonJS({
  "node_modules/ramda/src/internal/_curry3.js"(exports, module) {
    var _curry12 = require_curry1();
    var _curry22 = require_curry2();
    var _isPlaceholder2 = require_isPlaceholder();
    function _curry32(fn) {
      return function f3(a, b, c2) {
        switch (arguments.length) {
          case 0:
            return f3;
          case 1:
            return _isPlaceholder2(a) ? f3 : _curry22(function(_b, _c) {
              return fn(a, _b, _c);
            });
          case 2:
            return _isPlaceholder2(a) && _isPlaceholder2(b) ? f3 : _isPlaceholder2(a) ? _curry22(function(_a, _c) {
              return fn(_a, b, _c);
            }) : _isPlaceholder2(b) ? _curry22(function(_b, _c) {
              return fn(a, _b, _c);
            }) : _curry12(function(_c) {
              return fn(a, b, _c);
            });
          default:
            return _isPlaceholder2(a) && _isPlaceholder2(b) && _isPlaceholder2(c2) ? f3 : _isPlaceholder2(a) && _isPlaceholder2(b) ? _curry22(function(_a, _b) {
              return fn(_a, _b, c2);
            }) : _isPlaceholder2(a) && _isPlaceholder2(c2) ? _curry22(function(_a, _c) {
              return fn(_a, b, _c);
            }) : _isPlaceholder2(b) && _isPlaceholder2(c2) ? _curry22(function(_b, _c) {
              return fn(a, _b, _c);
            }) : _isPlaceholder2(a) ? _curry12(function(_a) {
              return fn(_a, b, c2);
            }) : _isPlaceholder2(b) ? _curry12(function(_b) {
              return fn(a, _b, c2);
            }) : _isPlaceholder2(c2) ? _curry12(function(_c) {
              return fn(a, b, _c);
            }) : fn(a, b, c2);
        }
      };
    }
    module.exports = _curry32;
  }
});

// node_modules/ramda/src/adjust.js
var require_adjust = __commonJS({
  "node_modules/ramda/src/adjust.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry32 = require_curry3();
    var adjust3 = /* @__PURE__ */ _curry32(function adjust4(idx, fn, list) {
      var len = list.length;
      if (idx >= len || idx < -len) {
        return list;
      }
      var _idx = (len + idx) % len;
      var _list = _concat2(list);
      _list[_idx] = fn(list[_idx]);
      return _list;
    });
    module.exports = adjust3;
  }
});

// node_modules/ramda/src/internal/_isArray.js
var require_isArray = __commonJS({
  "node_modules/ramda/src/internal/_isArray.js"(exports, module) {
    module.exports = Array.isArray || function _isArray2(val) {
      return val != null && val.length >= 0 && Object.prototype.toString.call(val) === "[object Array]";
    };
  }
});

// node_modules/ramda/src/internal/_isTransformer.js
var require_isTransformer = __commonJS({
  "node_modules/ramda/src/internal/_isTransformer.js"(exports, module) {
    function _isTransformer2(obj) {
      return obj != null && typeof obj["@@transducer/step"] === "function";
    }
    module.exports = _isTransformer2;
  }
});

// node_modules/ramda/src/internal/_dispatchable.js
var require_dispatchable = __commonJS({
  "node_modules/ramda/src/internal/_dispatchable.js"(exports, module) {
    var _isArray2 = require_isArray();
    var _isTransformer2 = require_isTransformer();
    function _dispatchable2(methodNames, transducerCreator, fn) {
      return function() {
        if (arguments.length === 0) {
          return fn();
        }
        var obj = arguments[arguments.length - 1];
        if (!_isArray2(obj)) {
          var idx = 0;
          while (idx < methodNames.length) {
            if (typeof obj[methodNames[idx]] === "function") {
              return obj[methodNames[idx]].apply(obj, Array.prototype.slice.call(arguments, 0, -1));
            }
            idx += 1;
          }
          if (_isTransformer2(obj)) {
            var transducer = transducerCreator.apply(null, Array.prototype.slice.call(arguments, 0, -1));
            return transducer(obj);
          }
        }
        return fn.apply(this, arguments);
      };
    }
    module.exports = _dispatchable2;
  }
});

// node_modules/ramda/src/internal/_reduced.js
var require_reduced = __commonJS({
  "node_modules/ramda/src/internal/_reduced.js"(exports, module) {
    function _reduced2(x) {
      return x && x["@@transducer/reduced"] ? x : {
        "@@transducer/value": x,
        "@@transducer/reduced": true
      };
    }
    module.exports = _reduced2;
  }
});

// node_modules/ramda/src/internal/_xfBase.js
var require_xfBase = __commonJS({
  "node_modules/ramda/src/internal/_xfBase.js"(exports, module) {
    module.exports = {
      init: function() {
        return this.xf["@@transducer/init"]();
      },
      result: function(result) {
        return this.xf["@@transducer/result"](result);
      }
    };
  }
});

// node_modules/ramda/src/internal/_xall.js
var require_xall = __commonJS({
  "node_modules/ramda/src/internal/_xall.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduced2 = require_reduced();
    var _xfBase = require_xfBase();
    var XAll2 = /* @__PURE__ */ function() {
      function XAll3(f, xf) {
        this.xf = xf;
        this.f = f;
        this.all = true;
      }
      XAll3.prototype["@@transducer/init"] = _xfBase.init;
      XAll3.prototype["@@transducer/result"] = function(result) {
        if (this.all) {
          result = this.xf["@@transducer/step"](result, true);
        }
        return this.xf["@@transducer/result"](result);
      };
      XAll3.prototype["@@transducer/step"] = function(result, input) {
        if (!this.f(input)) {
          this.all = false;
          result = _reduced2(this.xf["@@transducer/step"](result, false));
        }
        return result;
      };
      return XAll3;
    }();
    var _xall3 = /* @__PURE__ */ _curry22(function _xall4(f, xf) {
      return new XAll2(f, xf);
    });
    module.exports = _xall3;
  }
});

// node_modules/ramda/src/all.js
var require_all = __commonJS({
  "node_modules/ramda/src/all.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xall3 = require_xall();
    var all3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["all"], _xall3, function all4(fn, list) {
        var idx = 0;
        while (idx < list.length) {
          if (!fn(list[idx])) {
            return false;
          }
          idx += 1;
        }
        return true;
      })
    );
    module.exports = all3;
  }
});

// node_modules/ramda/src/max.js
var require_max = __commonJS({
  "node_modules/ramda/src/max.js"(exports, module) {
    var _curry22 = require_curry2();
    var max3 = /* @__PURE__ */ _curry22(function max4(a, b) {
      return b > a ? b : a;
    });
    module.exports = max3;
  }
});

// node_modules/ramda/src/internal/_map.js
var require_map = __commonJS({
  "node_modules/ramda/src/internal/_map.js"(exports, module) {
    function _map2(fn, functor) {
      var idx = 0;
      var len = functor.length;
      var result = Array(len);
      while (idx < len) {
        result[idx] = fn(functor[idx]);
        idx += 1;
      }
      return result;
    }
    module.exports = _map2;
  }
});

// node_modules/ramda/src/internal/_isString.js
var require_isString = __commonJS({
  "node_modules/ramda/src/internal/_isString.js"(exports, module) {
    function _isString2(x) {
      return Object.prototype.toString.call(x) === "[object String]";
    }
    module.exports = _isString2;
  }
});

// node_modules/ramda/src/internal/_isArrayLike.js
var require_isArrayLike = __commonJS({
  "node_modules/ramda/src/internal/_isArrayLike.js"(exports, module) {
    var _curry12 = require_curry1();
    var _isArray2 = require_isArray();
    var _isString2 = require_isString();
    var _isArrayLike2 = /* @__PURE__ */ _curry12(function isArrayLike2(x) {
      if (_isArray2(x)) {
        return true;
      }
      if (!x) {
        return false;
      }
      if (typeof x !== "object") {
        return false;
      }
      if (_isString2(x)) {
        return false;
      }
      if (x.length === 0) {
        return true;
      }
      if (x.length > 0) {
        return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
      }
      return false;
    });
    module.exports = _isArrayLike2;
  }
});

// node_modules/ramda/src/internal/_xwrap.js
var require_xwrap = __commonJS({
  "node_modules/ramda/src/internal/_xwrap.js"(exports, module) {
    var XWrap2 = /* @__PURE__ */ function() {
      function XWrap3(fn) {
        this.f = fn;
      }
      XWrap3.prototype["@@transducer/init"] = function() {
        throw new Error("init not implemented on XWrap");
      };
      XWrap3.prototype["@@transducer/result"] = function(acc) {
        return acc;
      };
      XWrap3.prototype["@@transducer/step"] = function(acc, x) {
        return this.f(acc, x);
      };
      return XWrap3;
    }();
    function _xwrap2(fn) {
      return new XWrap2(fn);
    }
    module.exports = _xwrap2;
  }
});

// node_modules/ramda/src/bind.js
var require_bind = __commonJS({
  "node_modules/ramda/src/bind.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry22 = require_curry2();
    var bind3 = /* @__PURE__ */ _curry22(function bind4(fn, thisObj) {
      return _arity2(fn.length, function() {
        return fn.apply(thisObj, arguments);
      });
    });
    module.exports = bind3;
  }
});

// node_modules/ramda/src/internal/_reduce.js
var require_reduce = __commonJS({
  "node_modules/ramda/src/internal/_reduce.js"(exports, module) {
    var _isArrayLike2 = require_isArrayLike();
    var _xwrap2 = require_xwrap();
    var bind3 = require_bind();
    function _arrayReduce2(xf, acc, list) {
      var idx = 0;
      var len = list.length;
      while (idx < len) {
        acc = xf["@@transducer/step"](acc, list[idx]);
        if (acc && acc["@@transducer/reduced"]) {
          acc = acc["@@transducer/value"];
          break;
        }
        idx += 1;
      }
      return xf["@@transducer/result"](acc);
    }
    function _iterableReduce2(xf, acc, iter) {
      var step = iter.next();
      while (!step.done) {
        acc = xf["@@transducer/step"](acc, step.value);
        if (acc && acc["@@transducer/reduced"]) {
          acc = acc["@@transducer/value"];
          break;
        }
        step = iter.next();
      }
      return xf["@@transducer/result"](acc);
    }
    function _methodReduce2(xf, acc, obj, methodName) {
      return xf["@@transducer/result"](obj[methodName](bind3(xf["@@transducer/step"], xf), acc));
    }
    var symIterator2 = typeof Symbol !== "undefined" ? Symbol.iterator : "@@iterator";
    function _reduce2(fn, acc, list) {
      if (typeof fn === "function") {
        fn = _xwrap2(fn);
      }
      if (_isArrayLike2(list)) {
        return _arrayReduce2(fn, acc, list);
      }
      if (typeof list["fantasy-land/reduce"] === "function") {
        return _methodReduce2(fn, acc, list, "fantasy-land/reduce");
      }
      if (list[symIterator2] != null) {
        return _iterableReduce2(fn, acc, list[symIterator2]());
      }
      if (typeof list.next === "function") {
        return _iterableReduce2(fn, acc, list);
      }
      if (typeof list.reduce === "function") {
        return _methodReduce2(fn, acc, list, "reduce");
      }
      throw new TypeError("reduce: list must be array or iterable");
    }
    module.exports = _reduce2;
  }
});

// node_modules/ramda/src/internal/_xmap.js
var require_xmap = __commonJS({
  "node_modules/ramda/src/internal/_xmap.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XMap2 = /* @__PURE__ */ function() {
      function XMap3(f, xf) {
        this.xf = xf;
        this.f = f;
      }
      XMap3.prototype["@@transducer/init"] = _xfBase.init;
      XMap3.prototype["@@transducer/result"] = _xfBase.result;
      XMap3.prototype["@@transducer/step"] = function(result, input) {
        return this.xf["@@transducer/step"](result, this.f(input));
      };
      return XMap3;
    }();
    var _xmap3 = /* @__PURE__ */ _curry22(function _xmap4(f, xf) {
      return new XMap2(f, xf);
    });
    module.exports = _xmap3;
  }
});

// node_modules/ramda/src/internal/_has.js
var require_has = __commonJS({
  "node_modules/ramda/src/internal/_has.js"(exports, module) {
    function _has2(prop4, obj) {
      return Object.prototype.hasOwnProperty.call(obj, prop4);
    }
    module.exports = _has2;
  }
});

// node_modules/ramda/src/internal/_isArguments.js
var require_isArguments = __commonJS({
  "node_modules/ramda/src/internal/_isArguments.js"(exports, module) {
    var _has2 = require_has();
    var toString4 = Object.prototype.toString;
    var _isArguments2 = /* @__PURE__ */ function() {
      return toString4.call(arguments) === "[object Arguments]" ? function _isArguments3(x) {
        return toString4.call(x) === "[object Arguments]";
      } : function _isArguments3(x) {
        return _has2("callee", x);
      };
    }();
    module.exports = _isArguments2;
  }
});

// node_modules/ramda/src/keys.js
var require_keys = __commonJS({
  "node_modules/ramda/src/keys.js"(exports, module) {
    var _curry12 = require_curry1();
    var _has2 = require_has();
    var _isArguments2 = require_isArguments();
    var hasEnumBug2 = !/* @__PURE__ */ {
      toString: null
    }.propertyIsEnumerable("toString");
    var nonEnumerableProps2 = ["constructor", "valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"];
    var hasArgsEnumBug2 = /* @__PURE__ */ function() {
      "use strict";
      return arguments.propertyIsEnumerable("length");
    }();
    var contains3 = function contains4(list, item) {
      var idx = 0;
      while (idx < list.length) {
        if (list[idx] === item) {
          return true;
        }
        idx += 1;
      }
      return false;
    };
    var keys6 = typeof Object.keys === "function" && !hasArgsEnumBug2 ? /* @__PURE__ */ _curry12(function keys7(obj) {
      return Object(obj) !== obj ? [] : Object.keys(obj);
    }) : /* @__PURE__ */ _curry12(function keys7(obj) {
      if (Object(obj) !== obj) {
        return [];
      }
      var prop4, nIdx;
      var ks = [];
      var checkArgsLength = hasArgsEnumBug2 && _isArguments2(obj);
      for (prop4 in obj) {
        if (_has2(prop4, obj) && (!checkArgsLength || prop4 !== "length")) {
          ks[ks.length] = prop4;
        }
      }
      if (hasEnumBug2) {
        nIdx = nonEnumerableProps2.length - 1;
        while (nIdx >= 0) {
          prop4 = nonEnumerableProps2[nIdx];
          if (_has2(prop4, obj) && !contains3(ks, prop4)) {
            ks[ks.length] = prop4;
          }
          nIdx -= 1;
        }
      }
      return ks;
    });
    module.exports = keys6;
  }
});

// node_modules/ramda/src/map.js
var require_map2 = __commonJS({
  "node_modules/ramda/src/map.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _map2 = require_map();
    var _reduce2 = require_reduce();
    var _xmap3 = require_xmap();
    var curryN3 = require_curryN2();
    var keys6 = require_keys();
    var map4 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["fantasy-land/map", "map"], _xmap3, function map5(fn, functor) {
        switch (Object.prototype.toString.call(functor)) {
          case "[object Function]":
            return curryN3(functor.length, function() {
              return fn.call(this, functor.apply(this, arguments));
            });
          case "[object Object]":
            return _reduce2(function(acc, key) {
              acc[key] = fn(functor[key]);
              return acc;
            }, {}, keys6(functor));
          default:
            return _map2(fn, functor);
        }
      })
    );
    module.exports = map4;
  }
});

// node_modules/ramda/src/internal/_isInteger.js
var require_isInteger = __commonJS({
  "node_modules/ramda/src/internal/_isInteger.js"(exports, module) {
    module.exports = Number.isInteger || function _isInteger2(n2) {
      return n2 << 0 === n2;
    };
  }
});

// node_modules/ramda/src/nth.js
var require_nth = __commonJS({
  "node_modules/ramda/src/nth.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isString2 = require_isString();
    var nth3 = /* @__PURE__ */ _curry22(function nth4(offset, list) {
      var idx = offset < 0 ? list.length + offset : offset;
      return _isString2(list) ? list.charAt(idx) : list[idx];
    });
    module.exports = nth3;
  }
});

// node_modules/ramda/src/prop.js
var require_prop = __commonJS({
  "node_modules/ramda/src/prop.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isInteger2 = require_isInteger();
    var nth3 = require_nth();
    var prop4 = /* @__PURE__ */ _curry22(function prop5(p, obj) {
      if (obj == null) {
        return;
      }
      return _isInteger2(p) ? nth3(p, obj) : obj[p];
    });
    module.exports = prop4;
  }
});

// node_modules/ramda/src/pluck.js
var require_pluck = __commonJS({
  "node_modules/ramda/src/pluck.js"(exports, module) {
    var _curry22 = require_curry2();
    var map4 = require_map2();
    var prop4 = require_prop();
    var pluck4 = /* @__PURE__ */ _curry22(function pluck5(p, list) {
      return map4(prop4(p), list);
    });
    module.exports = pluck4;
  }
});

// node_modules/ramda/src/reduce.js
var require_reduce2 = __commonJS({
  "node_modules/ramda/src/reduce.js"(exports, module) {
    var _curry32 = require_curry3();
    var _reduce2 = require_reduce();
    var reduce2 = /* @__PURE__ */ _curry32(_reduce2);
    module.exports = reduce2;
  }
});

// node_modules/ramda/src/allPass.js
var require_allPass = __commonJS({
  "node_modules/ramda/src/allPass.js"(exports, module) {
    var _curry12 = require_curry1();
    var curryN3 = require_curryN2();
    var max3 = require_max();
    var pluck4 = require_pluck();
    var reduce2 = require_reduce2();
    var allPass3 = /* @__PURE__ */ _curry12(function allPass4(preds) {
      return curryN3(reduce2(max3, 0, pluck4("length", preds)), function() {
        var idx = 0;
        var len = preds.length;
        while (idx < len) {
          if (!preds[idx].apply(this, arguments)) {
            return false;
          }
          idx += 1;
        }
        return true;
      });
    });
    module.exports = allPass3;
  }
});

// node_modules/ramda/src/always.js
var require_always = __commonJS({
  "node_modules/ramda/src/always.js"(exports, module) {
    var _curry12 = require_curry1();
    var always3 = /* @__PURE__ */ _curry12(function always4(val) {
      return function() {
        return val;
      };
    });
    module.exports = always3;
  }
});

// node_modules/ramda/src/and.js
var require_and = __commonJS({
  "node_modules/ramda/src/and.js"(exports, module) {
    var _curry22 = require_curry2();
    var and3 = /* @__PURE__ */ _curry22(function and4(a, b) {
      return a && b;
    });
    module.exports = and3;
  }
});

// node_modules/ramda/src/internal/_xany.js
var require_xany = __commonJS({
  "node_modules/ramda/src/internal/_xany.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduced2 = require_reduced();
    var _xfBase = require_xfBase();
    var XAny2 = /* @__PURE__ */ function() {
      function XAny3(f, xf) {
        this.xf = xf;
        this.f = f;
        this.any = false;
      }
      XAny3.prototype["@@transducer/init"] = _xfBase.init;
      XAny3.prototype["@@transducer/result"] = function(result) {
        if (!this.any) {
          result = this.xf["@@transducer/step"](result, false);
        }
        return this.xf["@@transducer/result"](result);
      };
      XAny3.prototype["@@transducer/step"] = function(result, input) {
        if (this.f(input)) {
          this.any = true;
          result = _reduced2(this.xf["@@transducer/step"](result, true));
        }
        return result;
      };
      return XAny3;
    }();
    var _xany3 = /* @__PURE__ */ _curry22(function _xany4(f, xf) {
      return new XAny2(f, xf);
    });
    module.exports = _xany3;
  }
});

// node_modules/ramda/src/any.js
var require_any = __commonJS({
  "node_modules/ramda/src/any.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xany3 = require_xany();
    var any3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["any"], _xany3, function any4(fn, list) {
        var idx = 0;
        while (idx < list.length) {
          if (fn(list[idx])) {
            return true;
          }
          idx += 1;
        }
        return false;
      })
    );
    module.exports = any3;
  }
});

// node_modules/ramda/src/anyPass.js
var require_anyPass = __commonJS({
  "node_modules/ramda/src/anyPass.js"(exports, module) {
    var _curry12 = require_curry1();
    var curryN3 = require_curryN2();
    var max3 = require_max();
    var pluck4 = require_pluck();
    var reduce2 = require_reduce2();
    var anyPass3 = /* @__PURE__ */ _curry12(function anyPass4(preds) {
      return curryN3(reduce2(max3, 0, pluck4("length", preds)), function() {
        var idx = 0;
        var len = preds.length;
        while (idx < len) {
          if (preds[idx].apply(this, arguments)) {
            return true;
          }
          idx += 1;
        }
        return false;
      });
    });
    module.exports = anyPass3;
  }
});

// node_modules/ramda/src/ap.js
var require_ap = __commonJS({
  "node_modules/ramda/src/ap.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry22 = require_curry2();
    var _reduce2 = require_reduce();
    var map4 = require_map2();
    var ap3 = /* @__PURE__ */ _curry22(function ap4(applyF, applyX) {
      return typeof applyX["fantasy-land/ap"] === "function" ? applyX["fantasy-land/ap"](applyF) : typeof applyF.ap === "function" ? applyF.ap(applyX) : typeof applyF === "function" ? function(x) {
        return applyF(x)(applyX(x));
      } : _reduce2(function(acc, f) {
        return _concat2(acc, map4(f, applyX));
      }, [], applyF);
    });
    module.exports = ap3;
  }
});

// node_modules/ramda/src/internal/_aperture.js
var require_aperture = __commonJS({
  "node_modules/ramda/src/internal/_aperture.js"(exports, module) {
    function _aperture2(n2, list) {
      var idx = 0;
      var limit = list.length - (n2 - 1);
      var acc = new Array(limit >= 0 ? limit : 0);
      while (idx < limit) {
        acc[idx] = Array.prototype.slice.call(list, idx, idx + n2);
        idx += 1;
      }
      return acc;
    }
    module.exports = _aperture2;
  }
});

// node_modules/ramda/src/internal/_xaperture.js
var require_xaperture = __commonJS({
  "node_modules/ramda/src/internal/_xaperture.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XAperture2 = /* @__PURE__ */ function() {
      function XAperture3(n2, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n2);
      }
      XAperture3.prototype["@@transducer/init"] = _xfBase.init;
      XAperture3.prototype["@@transducer/result"] = function(result) {
        this.acc = null;
        return this.xf["@@transducer/result"](result);
      };
      XAperture3.prototype["@@transducer/step"] = function(result, input) {
        this.store(input);
        return this.full ? this.xf["@@transducer/step"](result, this.getCopy()) : result;
      };
      XAperture3.prototype.store = function(input) {
        this.acc[this.pos] = input;
        this.pos += 1;
        if (this.pos === this.acc.length) {
          this.pos = 0;
          this.full = true;
        }
      };
      XAperture3.prototype.getCopy = function() {
        return _concat2(Array.prototype.slice.call(this.acc, this.pos), Array.prototype.slice.call(this.acc, 0, this.pos));
      };
      return XAperture3;
    }();
    var _xaperture3 = /* @__PURE__ */ _curry22(function _xaperture4(n2, xf) {
      return new XAperture2(n2, xf);
    });
    module.exports = _xaperture3;
  }
});

// node_modules/ramda/src/aperture.js
var require_aperture2 = __commonJS({
  "node_modules/ramda/src/aperture.js"(exports, module) {
    var _aperture2 = require_aperture();
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xaperture3 = require_xaperture();
    var aperture2 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xaperture3, _aperture2)
    );
    module.exports = aperture2;
  }
});

// node_modules/ramda/src/append.js
var require_append = __commonJS({
  "node_modules/ramda/src/append.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry22 = require_curry2();
    var append4 = /* @__PURE__ */ _curry22(function append5(el, list) {
      return _concat2(list, [el]);
    });
    module.exports = append4;
  }
});

// node_modules/ramda/src/apply.js
var require_apply = __commonJS({
  "node_modules/ramda/src/apply.js"(exports, module) {
    var _curry22 = require_curry2();
    var apply3 = /* @__PURE__ */ _curry22(function apply4(fn, args) {
      return fn.apply(this, args);
    });
    module.exports = apply3;
  }
});

// node_modules/ramda/src/values.js
var require_values = __commonJS({
  "node_modules/ramda/src/values.js"(exports, module) {
    var _curry12 = require_curry1();
    var keys6 = require_keys();
    var values4 = /* @__PURE__ */ _curry12(function values5(obj) {
      var props3 = keys6(obj);
      var len = props3.length;
      var vals = [];
      var idx = 0;
      while (idx < len) {
        vals[idx] = obj[props3[idx]];
        idx += 1;
      }
      return vals;
    });
    module.exports = values4;
  }
});

// node_modules/ramda/src/applySpec.js
var require_applySpec = __commonJS({
  "node_modules/ramda/src/applySpec.js"(exports, module) {
    var _curry12 = require_curry1();
    var _isArray2 = require_isArray();
    var apply3 = require_apply();
    var curryN3 = require_curryN2();
    var max3 = require_max();
    var pluck4 = require_pluck();
    var reduce2 = require_reduce2();
    var keys6 = require_keys();
    var values4 = require_values();
    function mapValues2(fn, obj) {
      return _isArray2(obj) ? obj.map(fn) : keys6(obj).reduce(function(acc, key) {
        acc[key] = fn(obj[key]);
        return acc;
      }, {});
    }
    var applySpec3 = /* @__PURE__ */ _curry12(function applySpec4(spec) {
      spec = mapValues2(function(v) {
        return typeof v == "function" ? v : applySpec4(v);
      }, spec);
      return curryN3(reduce2(max3, 0, pluck4("length", values4(spec))), function() {
        var args = arguments;
        return mapValues2(function(f) {
          return apply3(f, args);
        }, spec);
      });
    });
    module.exports = applySpec3;
  }
});

// node_modules/ramda/src/applyTo.js
var require_applyTo = __commonJS({
  "node_modules/ramda/src/applyTo.js"(exports, module) {
    var _curry22 = require_curry2();
    var applyTo3 = /* @__PURE__ */ _curry22(function applyTo4(x, f) {
      return f(x);
    });
    module.exports = applyTo3;
  }
});

// node_modules/ramda/src/ascend.js
var require_ascend = __commonJS({
  "node_modules/ramda/src/ascend.js"(exports, module) {
    var _curry32 = require_curry3();
    var ascend4 = /* @__PURE__ */ _curry32(function ascend5(fn, a, b) {
      var aa = fn(a);
      var bb = fn(b);
      return aa < bb ? -1 : aa > bb ? 1 : 0;
    });
    module.exports = ascend4;
  }
});

// node_modules/ramda/src/internal/_assoc.js
var require_assoc = __commonJS({
  "node_modules/ramda/src/internal/_assoc.js"(exports, module) {
    var _isArray2 = require_isArray();
    var _isInteger2 = require_isInteger();
    function _assoc2(prop4, val, obj) {
      if (_isInteger2(prop4) && _isArray2(obj)) {
        var arr = [].concat(obj);
        arr[prop4] = val;
        return arr;
      }
      var result = {};
      for (var p in obj) {
        result[p] = obj[p];
      }
      result[prop4] = val;
      return result;
    }
    module.exports = _assoc2;
  }
});

// node_modules/ramda/src/isNil.js
var require_isNil = __commonJS({
  "node_modules/ramda/src/isNil.js"(exports, module) {
    var _curry12 = require_curry1();
    var isNil4 = /* @__PURE__ */ _curry12(function isNil5(x) {
      return x == null;
    });
    module.exports = isNil4;
  }
});

// node_modules/ramda/src/assocPath.js
var require_assocPath = __commonJS({
  "node_modules/ramda/src/assocPath.js"(exports, module) {
    var _curry32 = require_curry3();
    var _has2 = require_has();
    var _isInteger2 = require_isInteger();
    var _assoc2 = require_assoc();
    var isNil4 = require_isNil();
    var assocPath3 = /* @__PURE__ */ _curry32(function assocPath4(path3, val, obj) {
      if (path3.length === 0) {
        return val;
      }
      var idx = path3[0];
      if (path3.length > 1) {
        var nextObj = !isNil4(obj) && _has2(idx, obj) ? obj[idx] : _isInteger2(path3[1]) ? [] : {};
        val = assocPath4(Array.prototype.slice.call(path3, 1), val, nextObj);
      }
      return _assoc2(idx, val, obj);
    });
    module.exports = assocPath3;
  }
});

// node_modules/ramda/src/assoc.js
var require_assoc2 = __commonJS({
  "node_modules/ramda/src/assoc.js"(exports, module) {
    var _curry32 = require_curry3();
    var assocPath3 = require_assocPath();
    var assoc3 = /* @__PURE__ */ _curry32(function assoc4(prop4, val, obj) {
      return assocPath3([prop4], val, obj);
    });
    module.exports = assoc3;
  }
});

// node_modules/ramda/src/nAry.js
var require_nAry = __commonJS({
  "node_modules/ramda/src/nAry.js"(exports, module) {
    var _curry22 = require_curry2();
    var nAry3 = /* @__PURE__ */ _curry22(function nAry4(n2, fn) {
      switch (n2) {
        case 0:
          return function() {
            return fn.call(this);
          };
        case 1:
          return function(a0) {
            return fn.call(this, a0);
          };
        case 2:
          return function(a0, a1) {
            return fn.call(this, a0, a1);
          };
        case 3:
          return function(a0, a1, a2) {
            return fn.call(this, a0, a1, a2);
          };
        case 4:
          return function(a0, a1, a2, a3) {
            return fn.call(this, a0, a1, a2, a3);
          };
        case 5:
          return function(a0, a1, a2, a3, a4) {
            return fn.call(this, a0, a1, a2, a3, a4);
          };
        case 6:
          return function(a0, a1, a2, a3, a4, a5) {
            return fn.call(this, a0, a1, a2, a3, a4, a5);
          };
        case 7:
          return function(a0, a1, a2, a3, a4, a5, a6) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6);
          };
        case 8:
          return function(a0, a1, a2, a3, a4, a5, a6, a7) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7);
          };
        case 9:
          return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8);
          };
        case 10:
          return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          };
        default:
          throw new Error("First argument to nAry must be a non-negative integer no greater than ten");
      }
    });
    module.exports = nAry3;
  }
});

// node_modules/ramda/src/binary.js
var require_binary = __commonJS({
  "node_modules/ramda/src/binary.js"(exports, module) {
    var _curry12 = require_curry1();
    var nAry3 = require_nAry();
    var binary3 = /* @__PURE__ */ _curry12(function binary4(fn) {
      return nAry3(2, fn);
    });
    module.exports = binary3;
  }
});

// node_modules/ramda/src/internal/_isFunction.js
var require_isFunction = __commonJS({
  "node_modules/ramda/src/internal/_isFunction.js"(exports, module) {
    function _isFunction2(x) {
      var type3 = Object.prototype.toString.call(x);
      return type3 === "[object Function]" || type3 === "[object AsyncFunction]" || type3 === "[object GeneratorFunction]" || type3 === "[object AsyncGeneratorFunction]";
    }
    module.exports = _isFunction2;
  }
});

// node_modules/ramda/src/liftN.js
var require_liftN = __commonJS({
  "node_modules/ramda/src/liftN.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduce2 = require_reduce();
    var ap3 = require_ap();
    var curryN3 = require_curryN2();
    var map4 = require_map2();
    var liftN3 = /* @__PURE__ */ _curry22(function liftN4(arity, fn) {
      var lifted = curryN3(arity, fn);
      return curryN3(arity, function() {
        return _reduce2(ap3, map4(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
      });
    });
    module.exports = liftN3;
  }
});

// node_modules/ramda/src/lift.js
var require_lift = __commonJS({
  "node_modules/ramda/src/lift.js"(exports, module) {
    var _curry12 = require_curry1();
    var liftN3 = require_liftN();
    var lift3 = /* @__PURE__ */ _curry12(function lift4(fn) {
      return liftN3(fn.length, fn);
    });
    module.exports = lift3;
  }
});

// node_modules/ramda/src/both.js
var require_both = __commonJS({
  "node_modules/ramda/src/both.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isFunction2 = require_isFunction();
    var and3 = require_and();
    var lift3 = require_lift();
    var both3 = /* @__PURE__ */ _curry22(function both4(f, g2) {
      return _isFunction2(f) ? function _both() {
        return f.apply(this, arguments) && g2.apply(this, arguments);
      } : lift3(and3)(f, g2);
    });
    module.exports = both3;
  }
});

// node_modules/ramda/src/call.js
var require_call = __commonJS({
  "node_modules/ramda/src/call.js"(exports, module) {
    var _curry12 = require_curry1();
    var call3 = /* @__PURE__ */ _curry12(function call4(fn) {
      return fn.apply(this, Array.prototype.slice.call(arguments, 1));
    });
    module.exports = call3;
  }
});

// node_modules/ramda/src/internal/_makeFlat.js
var require_makeFlat = __commonJS({
  "node_modules/ramda/src/internal/_makeFlat.js"(exports, module) {
    var _isArrayLike2 = require_isArrayLike();
    function _makeFlat2(recursive) {
      return function flatt(list) {
        var value, jlen, j;
        var result = [];
        var idx = 0;
        var ilen = list.length;
        while (idx < ilen) {
          if (_isArrayLike2(list[idx])) {
            value = recursive ? flatt(list[idx]) : list[idx];
            j = 0;
            jlen = value.length;
            while (j < jlen) {
              result[result.length] = value[j];
              j += 1;
            }
          } else {
            result[result.length] = list[idx];
          }
          idx += 1;
        }
        return result;
      };
    }
    module.exports = _makeFlat2;
  }
});

// node_modules/ramda/src/internal/_forceReduced.js
var require_forceReduced = __commonJS({
  "node_modules/ramda/src/internal/_forceReduced.js"(exports, module) {
    function _forceReduced2(x) {
      return {
        "@@transducer/value": x,
        "@@transducer/reduced": true
      };
    }
    module.exports = _forceReduced2;
  }
});

// node_modules/ramda/src/internal/_flatCat.js
var require_flatCat = __commonJS({
  "node_modules/ramda/src/internal/_flatCat.js"(exports, module) {
    var _forceReduced2 = require_forceReduced();
    var _isArrayLike2 = require_isArrayLike();
    var _reduce2 = require_reduce();
    var _xfBase = require_xfBase();
    var preservingReduced2 = function(xf) {
      return {
        "@@transducer/init": _xfBase.init,
        "@@transducer/result": function(result) {
          return xf["@@transducer/result"](result);
        },
        "@@transducer/step": function(result, input) {
          var ret = xf["@@transducer/step"](result, input);
          return ret["@@transducer/reduced"] ? _forceReduced2(ret) : ret;
        }
      };
    };
    var _flatCat2 = function _xcat2(xf) {
      var rxf = preservingReduced2(xf);
      return {
        "@@transducer/init": _xfBase.init,
        "@@transducer/result": function(result) {
          return rxf["@@transducer/result"](result);
        },
        "@@transducer/step": function(result, input) {
          return !_isArrayLike2(input) ? _reduce2(rxf, result, [input]) : _reduce2(rxf, result, input);
        }
      };
    };
    module.exports = _flatCat2;
  }
});

// node_modules/ramda/src/internal/_xchain.js
var require_xchain = __commonJS({
  "node_modules/ramda/src/internal/_xchain.js"(exports, module) {
    var _curry22 = require_curry2();
    var _flatCat2 = require_flatCat();
    var map4 = require_map2();
    var _xchain3 = /* @__PURE__ */ _curry22(function _xchain4(f, xf) {
      return map4(f, _flatCat2(xf));
    });
    module.exports = _xchain3;
  }
});

// node_modules/ramda/src/chain.js
var require_chain = __commonJS({
  "node_modules/ramda/src/chain.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _makeFlat2 = require_makeFlat();
    var _xchain3 = require_xchain();
    var map4 = require_map2();
    var chain3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["fantasy-land/chain", "chain"], _xchain3, function chain4(fn, monad) {
        if (typeof monad === "function") {
          return function(x) {
            return fn(monad(x))(x);
          };
        }
        return _makeFlat2(false)(map4(fn, monad));
      })
    );
    module.exports = chain3;
  }
});

// node_modules/ramda/src/clamp.js
var require_clamp = __commonJS({
  "node_modules/ramda/src/clamp.js"(exports, module) {
    var _curry32 = require_curry3();
    var clamp3 = /* @__PURE__ */ _curry32(function clamp4(min3, max3, value) {
      if (min3 > max3) {
        throw new Error("min must not be greater than max in clamp(min, max, value)");
      }
      return value < min3 ? min3 : value > max3 ? max3 : value;
    });
    module.exports = clamp3;
  }
});

// node_modules/ramda/src/internal/_cloneRegExp.js
var require_cloneRegExp = __commonJS({
  "node_modules/ramda/src/internal/_cloneRegExp.js"(exports, module) {
    function _cloneRegExp2(pattern) {
      return new RegExp(pattern.source, (pattern.global ? "g" : "") + (pattern.ignoreCase ? "i" : "") + (pattern.multiline ? "m" : "") + (pattern.sticky ? "y" : "") + (pattern.unicode ? "u" : ""));
    }
    module.exports = _cloneRegExp2;
  }
});

// node_modules/ramda/src/type.js
var require_type = __commonJS({
  "node_modules/ramda/src/type.js"(exports, module) {
    var _curry12 = require_curry1();
    var type3 = /* @__PURE__ */ _curry12(function type4(val) {
      return val === null ? "Null" : val === void 0 ? "Undefined" : Object.prototype.toString.call(val).slice(8, -1);
    });
    module.exports = type3;
  }
});

// node_modules/ramda/src/internal/_clone.js
var require_clone = __commonJS({
  "node_modules/ramda/src/internal/_clone.js"(exports, module) {
    var _cloneRegExp2 = require_cloneRegExp();
    var type3 = require_type();
    function _clone2(value, refFrom, refTo, deep) {
      var copy = function copy2(copiedValue) {
        var len = refFrom.length;
        var idx = 0;
        while (idx < len) {
          if (value === refFrom[idx]) {
            return refTo[idx];
          }
          idx += 1;
        }
        refFrom[idx] = value;
        refTo[idx] = copiedValue;
        for (var key in value) {
          if (value.hasOwnProperty(key)) {
            copiedValue[key] = deep ? _clone2(value[key], refFrom, refTo, true) : value[key];
          }
        }
        return copiedValue;
      };
      switch (type3(value)) {
        case "Object":
          return copy(Object.create(Object.getPrototypeOf(value)));
        case "Array":
          return copy([]);
        case "Date":
          return new Date(value.valueOf());
        case "RegExp":
          return _cloneRegExp2(value);
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array":
          return value.slice();
        default:
          return value;
      }
    }
    module.exports = _clone2;
  }
});

// node_modules/ramda/src/clone.js
var require_clone2 = __commonJS({
  "node_modules/ramda/src/clone.js"(exports, module) {
    var _clone2 = require_clone();
    var _curry12 = require_curry1();
    var clone5 = /* @__PURE__ */ _curry12(function clone6(value) {
      return value != null && typeof value.clone === "function" ? value.clone() : _clone2(value, [], [], true);
    });
    module.exports = clone5;
  }
});

// node_modules/ramda/src/collectBy.js
var require_collectBy = __commonJS({
  "node_modules/ramda/src/collectBy.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduce2 = require_reduce();
    var collectBy3 = /* @__PURE__ */ _curry22(function collectBy4(fn, list) {
      var group = _reduce2(function(o3, x) {
        var tag2 = fn(x);
        if (o3[tag2] === void 0) {
          o3[tag2] = [];
        }
        o3[tag2].push(x);
        return o3;
      }, {}, list);
      var newList = [];
      for (var tag in group) {
        newList.push(group[tag]);
      }
      return newList;
    });
    module.exports = collectBy3;
  }
});

// node_modules/ramda/src/comparator.js
var require_comparator = __commonJS({
  "node_modules/ramda/src/comparator.js"(exports, module) {
    var _curry12 = require_curry1();
    var comparator3 = /* @__PURE__ */ _curry12(function comparator4(pred) {
      return function(a, b) {
        return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
      };
    });
    module.exports = comparator3;
  }
});

// node_modules/ramda/src/not.js
var require_not = __commonJS({
  "node_modules/ramda/src/not.js"(exports, module) {
    var _curry12 = require_curry1();
    var not3 = /* @__PURE__ */ _curry12(function not4(a) {
      return !a;
    });
    module.exports = not3;
  }
});

// node_modules/ramda/src/complement.js
var require_complement = __commonJS({
  "node_modules/ramda/src/complement.js"(exports, module) {
    var lift3 = require_lift();
    var not3 = require_not();
    var complement2 = /* @__PURE__ */ lift3(not3);
    module.exports = complement2;
  }
});

// node_modules/ramda/src/internal/_pipe.js
var require_pipe = __commonJS({
  "node_modules/ramda/src/internal/_pipe.js"(exports, module) {
    function _pipe2(f, g2) {
      return function() {
        return g2.call(this, f.apply(this, arguments));
      };
    }
    module.exports = _pipe2;
  }
});

// node_modules/ramda/src/internal/_checkForMethod.js
var require_checkForMethod = __commonJS({
  "node_modules/ramda/src/internal/_checkForMethod.js"(exports, module) {
    var _isArray2 = require_isArray();
    function _checkForMethod2(methodname, fn) {
      return function() {
        var length3 = arguments.length;
        if (length3 === 0) {
          return fn();
        }
        var obj = arguments[length3 - 1];
        return _isArray2(obj) || typeof obj[methodname] !== "function" ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length3 - 1));
      };
    }
    module.exports = _checkForMethod2;
  }
});

// node_modules/ramda/src/slice.js
var require_slice = __commonJS({
  "node_modules/ramda/src/slice.js"(exports, module) {
    var _checkForMethod2 = require_checkForMethod();
    var _curry32 = require_curry3();
    var slice4 = /* @__PURE__ */ _curry32(
      /* @__PURE__ */ _checkForMethod2("slice", function slice5(fromIndex, toIndex, list) {
      return Array.prototype.slice.call(list, fromIndex, toIndex);
    })
  );
    module.exports = slice4;
  }
});

// node_modules/ramda/src/tail.js
var require_tail = __commonJS({
  "node_modules/ramda/src/tail.js"(exports, module) {
    var _checkForMethod2 = require_checkForMethod();
    var _curry12 = require_curry1();
    var slice4 = require_slice();
    var tail2 = /* @__PURE__ */ _curry12(
      /* @__PURE__ */ _checkForMethod2(
        "tail",
      /* @__PURE__ */ slice4(1, Infinity)
  )
  );
    module.exports = tail2;
  }
});

// node_modules/ramda/src/pipe.js
var require_pipe2 = __commonJS({
  "node_modules/ramda/src/pipe.js"(exports, module) {
    var _arity2 = require_arity();
    var _pipe2 = require_pipe();
    var reduce2 = require_reduce2();
    var tail2 = require_tail();
    function pipe2() {
      if (arguments.length === 0) {
        throw new Error("pipe requires at least one argument");
      }
      return _arity2(arguments[0].length, reduce2(_pipe2, arguments[0], tail2(arguments)));
    }
    module.exports = pipe2;
  }
});

// node_modules/ramda/src/reverse.js
var require_reverse = __commonJS({
  "node_modules/ramda/src/reverse.js"(exports, module) {
    var _curry12 = require_curry1();
    var _isString2 = require_isString();
    var reverse4 = /* @__PURE__ */ _curry12(function reverse5(list) {
      return _isString2(list) ? list.split("").reverse().join("") : Array.prototype.slice.call(list, 0).reverse();
    });
    module.exports = reverse4;
  }
});

// node_modules/ramda/src/compose.js
var require_compose = __commonJS({
  "node_modules/ramda/src/compose.js"(exports, module) {
    var pipe2 = require_pipe2();
    var reverse4 = require_reverse();
    function compose3() {
      if (arguments.length === 0) {
        throw new Error("compose requires at least one argument");
      }
      return pipe2.apply(this, reverse4(arguments));
    }
    module.exports = compose3;
  }
});

// node_modules/ramda/src/head.js
var require_head = __commonJS({
  "node_modules/ramda/src/head.js"(exports, module) {
    var nth3 = require_nth();
    var head2 = /* @__PURE__ */ nth3(0);
    module.exports = head2;
  }
});

// node_modules/ramda/src/internal/_identity.js
var require_identity = __commonJS({
  "node_modules/ramda/src/internal/_identity.js"(exports, module) {
    function _identity2(x) {
      return x;
    }
    module.exports = _identity2;
  }
});

// node_modules/ramda/src/identity.js
var require_identity2 = __commonJS({
  "node_modules/ramda/src/identity.js"(exports, module) {
    var _curry12 = require_curry1();
    var _identity2 = require_identity();
    var identity2 = /* @__PURE__ */ _curry12(_identity2);
    module.exports = identity2;
  }
});

// node_modules/ramda/src/pipeWith.js
var require_pipeWith = __commonJS({
  "node_modules/ramda/src/pipeWith.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry22 = require_curry2();
    var head2 = require_head();
    var _reduce2 = require_reduce();
    var tail2 = require_tail();
    var identity2 = require_identity2();
    var pipeWith3 = /* @__PURE__ */ _curry22(function pipeWith4(xf, list) {
      if (list.length <= 0) {
        return identity2;
      }
      var headList = head2(list);
      var tailList = tail2(list);
      return _arity2(headList.length, function() {
        return _reduce2(function(result, f) {
          return xf.call(this, f, result);
        }, headList.apply(this, arguments), tailList);
      });
    });
    module.exports = pipeWith3;
  }
});

// node_modules/ramda/src/composeWith.js
var require_composeWith = __commonJS({
  "node_modules/ramda/src/composeWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var pipeWith3 = require_pipeWith();
    var reverse4 = require_reverse();
    var composeWith3 = /* @__PURE__ */ _curry22(function composeWith4(xf, list) {
      return pipeWith3.apply(this, [xf, reverse4(list)]);
    });
    module.exports = composeWith3;
  }
});

// node_modules/ramda/src/internal/_arrayFromIterator.js
var require_arrayFromIterator = __commonJS({
  "node_modules/ramda/src/internal/_arrayFromIterator.js"(exports, module) {
    function _arrayFromIterator2(iter) {
      var list = [];
      var next;
      while (!(next = iter.next()).done) {
        list.push(next.value);
      }
      return list;
    }
    module.exports = _arrayFromIterator2;
  }
});

// node_modules/ramda/src/internal/_includesWith.js
var require_includesWith = __commonJS({
  "node_modules/ramda/src/internal/_includesWith.js"(exports, module) {
    function _includesWith2(pred, x, list) {
      var idx = 0;
      var len = list.length;
      while (idx < len) {
        if (pred(x, list[idx])) {
          return true;
        }
        idx += 1;
      }
      return false;
    }
    module.exports = _includesWith2;
  }
});

// node_modules/ramda/src/internal/_functionName.js
var require_functionName = __commonJS({
  "node_modules/ramda/src/internal/_functionName.js"(exports, module) {
    function _functionName2(f) {
      var match3 = String(f).match(/^function (\w*)/);
      return match3 == null ? "" : match3[1];
    }
    module.exports = _functionName2;
  }
});

// node_modules/ramda/src/internal/_objectIs.js
var require_objectIs = __commonJS({
  "node_modules/ramda/src/internal/_objectIs.js"(exports, module) {
    function _objectIs2(a, b) {
      if (a === b) {
        return a !== 0 || 1 / a === 1 / b;
      } else {
        return a !== a && b !== b;
      }
    }
    module.exports = typeof Object.is === "function" ? Object.is : _objectIs2;
  }
});

// node_modules/ramda/src/internal/_equals.js
var require_equals = __commonJS({
  "node_modules/ramda/src/internal/_equals.js"(exports, module) {
    var _arrayFromIterator2 = require_arrayFromIterator();
    var _includesWith2 = require_includesWith();
    var _functionName2 = require_functionName();
    var _has2 = require_has();
    var _objectIs2 = require_objectIs();
    var keys6 = require_keys();
    var type3 = require_type();
    function _uniqContentEquals2(aIterator, bIterator, stackA, stackB) {
      var a = _arrayFromIterator2(aIterator);
      var b = _arrayFromIterator2(bIterator);
      function eq(_a, _b) {
        return _equals2(_a, _b, stackA.slice(), stackB.slice());
      }
      return !_includesWith2(function(b2, aItem) {
        return !_includesWith2(eq, aItem, b2);
      }, b, a);
    }
    function _equals2(a, b, stackA, stackB) {
      if (_objectIs2(a, b)) {
        return true;
      }
      var typeA = type3(a);
      if (typeA !== type3(b)) {
        return false;
      }
      if (typeof a["fantasy-land/equals"] === "function" || typeof b["fantasy-land/equals"] === "function") {
        return typeof a["fantasy-land/equals"] === "function" && a["fantasy-land/equals"](b) && typeof b["fantasy-land/equals"] === "function" && b["fantasy-land/equals"](a);
      }
      if (typeof a.equals === "function" || typeof b.equals === "function") {
        return typeof a.equals === "function" && a.equals(b) && typeof b.equals === "function" && b.equals(a);
      }
      switch (typeA) {
        case "Arguments":
        case "Array":
        case "Object":
          if (typeof a.constructor === "function" && _functionName2(a.constructor) === "Promise") {
          return a === b;
        }
          break;
        case "Boolean":
        case "Number":
        case "String":
          if (!(typeof a === typeof b && _objectIs2(a.valueOf(), b.valueOf()))) {
            return false;
          }
          break;
        case "Date":
          if (!_objectIs2(a.valueOf(), b.valueOf())) {
            return false;
          }
          break;
        case "Error":
          return a.name === b.name && a.message === b.message;
        case "RegExp":
          if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
            return false;
          }
          break;
      }
      var idx = stackA.length - 1;
      while (idx >= 0) {
        if (stackA[idx] === a) {
          return stackB[idx] === b;
        }
        idx -= 1;
      }
      switch (typeA) {
        case "Map":
          if (a.size !== b.size) {
            return false;
          }
          return _uniqContentEquals2(a.entries(), b.entries(), stackA.concat([a]), stackB.concat([b]));
        case "Set":
          if (a.size !== b.size) {
            return false;
          }
          return _uniqContentEquals2(a.values(), b.values(), stackA.concat([a]), stackB.concat([b]));
        case "Arguments":
        case "Array":
        case "Object":
        case "Boolean":
        case "Number":
        case "String":
        case "Date":
        case "Error":
        case "RegExp":
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "ArrayBuffer":
          break;
        default:
          return false;
      }
      var keysA = keys6(a);
      if (keysA.length !== keys6(b).length) {
        return false;
      }
      var extendedStackA = stackA.concat([a]);
      var extendedStackB = stackB.concat([b]);
      idx = keysA.length - 1;
      while (idx >= 0) {
        var key = keysA[idx];
        if (!(_has2(key, b) && _equals2(b[key], a[key], extendedStackA, extendedStackB))) {
          return false;
        }
        idx -= 1;
      }
      return true;
    }
    module.exports = _equals2;
  }
});

// node_modules/ramda/src/equals.js
var require_equals2 = __commonJS({
  "node_modules/ramda/src/equals.js"(exports, module) {
    var _curry22 = require_curry2();
    var _equals2 = require_equals();
    var equals4 = /* @__PURE__ */ _curry22(function equals5(a, b) {
      return _equals2(a, b, [], []);
    });
    module.exports = equals4;
  }
});

// node_modules/ramda/src/internal/_indexOf.js
var require_indexOf = __commonJS({
  "node_modules/ramda/src/internal/_indexOf.js"(exports, module) {
    var equals4 = require_equals2();
    function _indexOf2(list, a, idx) {
      var inf, item;
      if (typeof list.indexOf === "function") {
        switch (typeof a) {
          case "number":
            if (a === 0) {
              inf = 1 / a;
              while (idx < list.length) {
                item = list[idx];
                if (item === 0 && 1 / item === inf) {
                  return idx;
                }
                idx += 1;
              }
              return -1;
            } else if (a !== a) {
              while (idx < list.length) {
                item = list[idx];
                if (typeof item === "number" && item !== item) {
                  return idx;
                }
                idx += 1;
              }
              return -1;
            }
            return list.indexOf(a, idx);
          case "string":
          case "boolean":
          case "function":
          case "undefined":
            return list.indexOf(a, idx);
          case "object":
            if (a === null) {
              return list.indexOf(a, idx);
            }
        }
      }
      while (idx < list.length) {
        if (equals4(list[idx], a)) {
          return idx;
        }
        idx += 1;
      }
      return -1;
    }
    module.exports = _indexOf2;
  }
});

// node_modules/ramda/src/internal/_includes.js
var require_includes = __commonJS({
  "node_modules/ramda/src/internal/_includes.js"(exports, module) {
    var _indexOf2 = require_indexOf();
    function _includes2(a, list) {
      return _indexOf2(list, a, 0) >= 0;
    }
    module.exports = _includes2;
  }
});

// node_modules/ramda/src/internal/_quote.js
var require_quote = __commonJS({
  "node_modules/ramda/src/internal/_quote.js"(exports, module) {
    function _quote2(s) {
      var escaped = s.replace(/\\/g, "\\\\").replace(/[\b]/g, "\\b").replace(/\f/g, "\\f").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\v/g, "\\v").replace(/\0/g, "\\0");
      return '"' + escaped.replace(/"/g, '\\"') + '"';
    }
    module.exports = _quote2;
  }
});

// node_modules/ramda/src/internal/_toISOString.js
var require_toISOString = __commonJS({
  "node_modules/ramda/src/internal/_toISOString.js"(exports, module) {
    var pad3 = function pad4(n2) {
      return (n2 < 10 ? "0" : "") + n2;
    };
    var _toISOString4 = typeof Date.prototype.toISOString === "function" ? function _toISOString5(d) {
      return d.toISOString();
    } : function _toISOString5(d) {
      return d.getUTCFullYear() + "-" + pad3(d.getUTCMonth() + 1) + "-" + pad3(d.getUTCDate()) + "T" + pad3(d.getUTCHours()) + ":" + pad3(d.getUTCMinutes()) + ":" + pad3(d.getUTCSeconds()) + "." + (d.getUTCMilliseconds() / 1e3).toFixed(3).slice(2, 5) + "Z";
    };
    module.exports = _toISOString4;
  }
});

// node_modules/ramda/src/internal/_complement.js
var require_complement2 = __commonJS({
  "node_modules/ramda/src/internal/_complement.js"(exports, module) {
    function _complement2(f) {
      return function() {
        return !f.apply(this, arguments);
      };
    }
    module.exports = _complement2;
  }
});

// node_modules/ramda/src/internal/_filter.js
var require_filter = __commonJS({
  "node_modules/ramda/src/internal/_filter.js"(exports, module) {
    function _filter2(fn, list) {
      var idx = 0;
      var len = list.length;
      var result = [];
      while (idx < len) {
        if (fn(list[idx])) {
          result[result.length] = list[idx];
        }
        idx += 1;
      }
      return result;
    }
    module.exports = _filter2;
  }
});

// node_modules/ramda/src/internal/_isObject.js
var require_isObject = __commonJS({
  "node_modules/ramda/src/internal/_isObject.js"(exports, module) {
    function _isObject2(x) {
      return Object.prototype.toString.call(x) === "[object Object]";
    }
    module.exports = _isObject2;
  }
});

// node_modules/ramda/src/internal/_xfilter.js
var require_xfilter = __commonJS({
  "node_modules/ramda/src/internal/_xfilter.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XFilter2 = /* @__PURE__ */ function() {
      function XFilter3(f, xf) {
        this.xf = xf;
        this.f = f;
      }
      XFilter3.prototype["@@transducer/init"] = _xfBase.init;
      XFilter3.prototype["@@transducer/result"] = _xfBase.result;
      XFilter3.prototype["@@transducer/step"] = function(result, input) {
        return this.f(input) ? this.xf["@@transducer/step"](result, input) : result;
      };
      return XFilter3;
    }();
    var _xfilter3 = /* @__PURE__ */ _curry22(function _xfilter4(f, xf) {
      return new XFilter2(f, xf);
    });
    module.exports = _xfilter3;
  }
});

// node_modules/ramda/src/filter.js
var require_filter2 = __commonJS({
  "node_modules/ramda/src/filter.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _filter2 = require_filter();
    var _isObject2 = require_isObject();
    var _reduce2 = require_reduce();
    var _xfilter3 = require_xfilter();
    var keys6 = require_keys();
    var filter3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["fantasy-land/filter", "filter"], _xfilter3, function(pred, filterable) {
        return _isObject2(filterable) ? _reduce2(function(acc, key) {
          if (pred(filterable[key])) {
            acc[key] = filterable[key];
          }
          return acc;
        }, {}, keys6(filterable)) : _filter2(pred, filterable);
      })
    );
    module.exports = filter3;
  }
});

// node_modules/ramda/src/reject.js
var require_reject = __commonJS({
  "node_modules/ramda/src/reject.js"(exports, module) {
    var _complement2 = require_complement2();
    var _curry22 = require_curry2();
    var filter3 = require_filter2();
    var reject3 = /* @__PURE__ */ _curry22(function reject4(pred, filterable) {
      return filter3(_complement2(pred), filterable);
    });
    module.exports = reject3;
  }
});

// node_modules/ramda/src/internal/_toString.js
var require_toString = __commonJS({
  "node_modules/ramda/src/internal/_toString.js"(exports, module) {
    var _includes2 = require_includes();
    var _map2 = require_map();
    var _quote2 = require_quote();
    var _toISOString4 = require_toISOString();
    var keys6 = require_keys();
    var reject3 = require_reject();
    function _toString2(x, seen) {
      var recur = function recur2(y) {
        var xs = seen.concat([x]);
        return _includes2(y, xs) ? "<Circular>" : _toString2(y, xs);
      };
      var mapPairs = function(obj, keys7) {
        return _map2(function(k) {
          return _quote2(k) + ": " + recur(obj[k]);
        }, keys7.slice().sort());
      };
      switch (Object.prototype.toString.call(x)) {
        case "[object Arguments]":
          return "(function() { return arguments; }(" + _map2(recur, x).join(", ") + "))";
        case "[object Array]":
          return "[" + _map2(recur, x).concat(mapPairs(x, reject3(function(k) {
            return /^\d+$/.test(k);
          }, keys6(x)))).join(", ") + "]";
        case "[object Boolean]":
          return typeof x === "object" ? "new Boolean(" + recur(x.valueOf()) + ")" : x.toString();
        case "[object Date]":
          return "new Date(" + (isNaN(x.valueOf()) ? recur(NaN) : _quote2(_toISOString4(x))) + ")";
        case "[object Null]":
          return "null";
        case "[object Number]":
          return typeof x === "object" ? "new Number(" + recur(x.valueOf()) + ")" : 1 / x === -Infinity ? "-0" : x.toString(10);
        case "[object String]":
          return typeof x === "object" ? "new String(" + recur(x.valueOf()) + ")" : _quote2(x);
        case "[object Undefined]":
          return "undefined";
        default:
          if (typeof x.toString === "function") {
          var repr = x.toString();
          if (repr !== "[object Object]") {
            return repr;
          }
        }
          return "{" + mapPairs(x, keys6(x)).join(", ") + "}";
      }
    }
    module.exports = _toString2;
  }
});

// node_modules/ramda/src/toString.js
var require_toString2 = __commonJS({
  "node_modules/ramda/src/toString.js"(exports, module) {
    var _curry12 = require_curry1();
    var _toString2 = require_toString();
    var toString4 = /* @__PURE__ */ _curry12(function toString5(val) {
      return _toString2(val, []);
    });
    module.exports = toString4;
  }
});

// node_modules/ramda/src/concat.js
var require_concat2 = __commonJS({
  "node_modules/ramda/src/concat.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isArray2 = require_isArray();
    var _isFunction2 = require_isFunction();
    var _isString2 = require_isString();
    var toString4 = require_toString2();
    var concat4 = /* @__PURE__ */ _curry22(function concat5(a, b) {
      if (_isArray2(a)) {
        if (_isArray2(b)) {
          return a.concat(b);
        }
        throw new TypeError(toString4(b) + " is not an array");
      }
      if (_isString2(a)) {
        if (_isString2(b)) {
          return a + b;
        }
        throw new TypeError(toString4(b) + " is not a string");
      }
      if (a != null && _isFunction2(a["fantasy-land/concat"])) {
        return a["fantasy-land/concat"](b);
      }
      if (a != null && _isFunction2(a.concat)) {
        return a.concat(b);
      }
      throw new TypeError(toString4(a) + ' does not have a method named "concat" or "fantasy-land/concat"');
    });
    module.exports = concat4;
  }
});

// node_modules/ramda/src/cond.js
var require_cond = __commonJS({
  "node_modules/ramda/src/cond.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry12 = require_curry1();
    var map4 = require_map2();
    var max3 = require_max();
    var reduce2 = require_reduce2();
    var cond3 = /* @__PURE__ */ _curry12(function cond4(pairs) {
      var arity = reduce2(max3, 0, map4(function(pair3) {
        return pair3[0].length;
      }, pairs));
      return _arity2(arity, function() {
        var idx = 0;
        while (idx < pairs.length) {
          if (pairs[idx][0].apply(this, arguments)) {
            return pairs[idx][1].apply(this, arguments);
          }
          idx += 1;
        }
      });
    });
    module.exports = cond3;
  }
});

// node_modules/ramda/src/curry.js
var require_curry = __commonJS({
  "node_modules/ramda/src/curry.js"(exports, module) {
    var _curry12 = require_curry1();
    var curryN3 = require_curryN2();
    var curry3 = /* @__PURE__ */ _curry12(function curry4(fn) {
      return curryN3(fn.length, fn);
    });
    module.exports = curry3;
  }
});

// node_modules/ramda/src/constructN.js
var require_constructN = __commonJS({
  "node_modules/ramda/src/constructN.js"(exports, module) {
    var _curry22 = require_curry2();
    var curry3 = require_curry();
    var nAry3 = require_nAry();
    var constructN3 = /* @__PURE__ */ _curry22(function constructN4(n2, Fn) {
      if (n2 > 10) {
        throw new Error("Constructor with greater than ten arguments");
      }
      if (n2 === 0) {
        return function() {
          return new Fn();
        };
      }
      return curry3(nAry3(n2, function($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) {
        switch (arguments.length) {
          case 1:
            return new Fn($0);
          case 2:
            return new Fn($0, $1);
          case 3:
            return new Fn($0, $1, $2);
          case 4:
            return new Fn($0, $1, $2, $3);
          case 5:
            return new Fn($0, $1, $2, $3, $4);
          case 6:
            return new Fn($0, $1, $2, $3, $4, $5);
          case 7:
            return new Fn($0, $1, $2, $3, $4, $5, $6);
          case 8:
            return new Fn($0, $1, $2, $3, $4, $5, $6, $7);
          case 9:
            return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8);
          case 10:
            return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8, $9);
        }
      }));
    });
    module.exports = constructN3;
  }
});

// node_modules/ramda/src/construct.js
var require_construct = __commonJS({
  "node_modules/ramda/src/construct.js"(exports, module) {
    var _curry12 = require_curry1();
    var constructN3 = require_constructN();
    var construct3 = /* @__PURE__ */ _curry12(function construct4(Fn) {
      return constructN3(Fn.length, Fn);
    });
    module.exports = construct3;
  }
});

// node_modules/ramda/src/converge.js
var require_converge = __commonJS({
  "node_modules/ramda/src/converge.js"(exports, module) {
    var _curry22 = require_curry2();
    var _map2 = require_map();
    var curryN3 = require_curryN2();
    var max3 = require_max();
    var pluck4 = require_pluck();
    var reduce2 = require_reduce2();
    var converge3 = /* @__PURE__ */ _curry22(function converge4(after, fns) {
      return curryN3(reduce2(max3, 0, pluck4("length", fns)), function() {
        var args = arguments;
        var context = this;
        return after.apply(context, _map2(function(fn) {
          return fn.apply(context, args);
        }, fns));
      });
    });
    module.exports = converge3;
  }
});

// node_modules/ramda/src/count.js
var require_count = __commonJS({
  "node_modules/ramda/src/count.js"(exports, module) {
    var _reduce2 = require_reduce();
    var curry3 = require_curry();
    var count2 = /* @__PURE__ */ curry3(function(pred, list) {
      return _reduce2(function(a, e) {
        return pred(e) ? a + 1 : a;
      }, 0, list);
    });
    module.exports = count2;
  }
});

// node_modules/ramda/src/internal/_xreduceBy.js
var require_xreduceBy = __commonJS({
  "node_modules/ramda/src/internal/_xreduceBy.js"(exports, module) {
    var _curryN2 = require_curryN();
    var _has2 = require_has();
    var _xfBase = require_xfBase();
    var XReduceBy2 = /* @__PURE__ */ function() {
      function XReduceBy3(valueFn, valueAcc, keyFn, xf) {
        this.valueFn = valueFn;
        this.valueAcc = valueAcc;
        this.keyFn = keyFn;
        this.xf = xf;
        this.inputs = {};
      }
      XReduceBy3.prototype["@@transducer/init"] = _xfBase.init;
      XReduceBy3.prototype["@@transducer/result"] = function(result) {
        var key;
        for (key in this.inputs) {
          if (_has2(key, this.inputs)) {
            result = this.xf["@@transducer/step"](result, this.inputs[key]);
            if (result["@@transducer/reduced"]) {
              result = result["@@transducer/value"];
              break;
            }
          }
        }
        this.inputs = null;
        return this.xf["@@transducer/result"](result);
      };
      XReduceBy3.prototype["@@transducer/step"] = function(result, input) {
        var key = this.keyFn(input);
        this.inputs[key] = this.inputs[key] || [key, this.valueAcc];
        this.inputs[key][1] = this.valueFn(this.inputs[key][1], input);
        return result;
      };
      return XReduceBy3;
    }();
    var _xreduceBy3 = /* @__PURE__ */ _curryN2(4, [], function _xreduceBy4(valueFn, valueAcc, keyFn, xf) {
      return new XReduceBy2(valueFn, valueAcc, keyFn, xf);
    });
    module.exports = _xreduceBy3;
  }
});

// node_modules/ramda/src/reduceBy.js
var require_reduceBy = __commonJS({
  "node_modules/ramda/src/reduceBy.js"(exports, module) {
    var _clone2 = require_clone();
    var _curryN2 = require_curryN();
    var _dispatchable2 = require_dispatchable();
    var _has2 = require_has();
    var _reduce2 = require_reduce();
    var _reduced2 = require_reduced();
    var _xreduceBy3 = require_xreduceBy();
    var reduceBy3 = /* @__PURE__ */ _curryN2(
      4,
      [],
      /* @__PURE__ */ _dispatchable2([], _xreduceBy3, function reduceBy4(valueFn, valueAcc, keyFn, list) {
        return _reduce2(function(acc, elt) {
          var key = keyFn(elt);
          var value = valueFn(_has2(key, acc) ? acc[key] : _clone2(valueAcc, [], [], false), elt);
          if (value && value["@@transducer/reduced"]) {
            return _reduced2(acc);
          }
          acc[key] = value;
          return acc;
        }, {}, list);
      })
    );
    module.exports = reduceBy3;
  }
});

// node_modules/ramda/src/countBy.js
var require_countBy = __commonJS({
  "node_modules/ramda/src/countBy.js"(exports, module) {
    var reduceBy3 = require_reduceBy();
    var countBy2 = /* @__PURE__ */ reduceBy3(function(acc, elem) {
      return acc + 1;
    }, 0);
    module.exports = countBy2;
  }
});

// node_modules/ramda/src/dec.js
var require_dec = __commonJS({
  "node_modules/ramda/src/dec.js"(exports, module) {
    var add4 = require_add();
    var dec2 = /* @__PURE__ */ add4(-1);
    module.exports = dec2;
  }
});

// node_modules/ramda/src/defaultTo.js
var require_defaultTo = __commonJS({
  "node_modules/ramda/src/defaultTo.js"(exports, module) {
    var _curry22 = require_curry2();
    var defaultTo3 = /* @__PURE__ */ _curry22(function defaultTo4(d, v) {
      return v == null || v !== v ? d : v;
    });
    module.exports = defaultTo3;
  }
});

// node_modules/ramda/src/descend.js
var require_descend = __commonJS({
  "node_modules/ramda/src/descend.js"(exports, module) {
    var _curry32 = require_curry3();
    var descend4 = /* @__PURE__ */ _curry32(function descend5(fn, a, b) {
      var aa = fn(a);
      var bb = fn(b);
      return aa > bb ? -1 : aa < bb ? 1 : 0;
    });
    module.exports = descend4;
  }
});

// node_modules/ramda/src/internal/_Set.js
var require_Set = __commonJS({
  "node_modules/ramda/src/internal/_Set.js"(exports, module) {
    var _includes2 = require_includes();
    var _Set2 = /* @__PURE__ */ function() {
      function _Set3() {
        this._nativeSet = typeof Set === "function" ? /* @__PURE__ */ new Set() : null;
        this._items = {};
      }
      _Set3.prototype.add = function(item) {
        return !hasOrAdd2(item, true, this);
      };
      _Set3.prototype.has = function(item) {
        return hasOrAdd2(item, false, this);
      };
      return _Set3;
    }();
    function hasOrAdd2(item, shouldAdd, set4) {
      var type3 = typeof item;
      var prevSize, newSize;
      switch (type3) {
        case "string":
        case "number":
          if (item === 0 && 1 / item === -Infinity) {
            if (set4._items["-0"]) {
              return true;
            } else {
              if (shouldAdd) {
                set4._items["-0"] = true;
              }
              return false;
            }
          }
          if (set4._nativeSet !== null) {
            if (shouldAdd) {
              prevSize = set4._nativeSet.size;
              set4._nativeSet.add(item);
              newSize = set4._nativeSet.size;
              return newSize === prevSize;
            } else {
              return set4._nativeSet.has(item);
            }
          } else {
            if (!(type3 in set4._items)) {
              if (shouldAdd) {
                set4._items[type3] = {};
                set4._items[type3][item] = true;
              }
              return false;
            } else if (item in set4._items[type3]) {
              return true;
            } else {
              if (shouldAdd) {
                set4._items[type3][item] = true;
              }
              return false;
            }
          }
        case "boolean":
          if (type3 in set4._items) {
            var bIdx = item ? 1 : 0;
            if (set4._items[type3][bIdx]) {
              return true;
            } else {
              if (shouldAdd) {
                set4._items[type3][bIdx] = true;
              }
              return false;
            }
          } else {
            if (shouldAdd) {
              set4._items[type3] = item ? [false, true] : [true, false];
            }
            return false;
          }
        case "function":
          if (set4._nativeSet !== null) {
            if (shouldAdd) {
              prevSize = set4._nativeSet.size;
              set4._nativeSet.add(item);
              newSize = set4._nativeSet.size;
              return newSize === prevSize;
            } else {
              return set4._nativeSet.has(item);
            }
          } else {
            if (!(type3 in set4._items)) {
              if (shouldAdd) {
                set4._items[type3] = [item];
              }
              return false;
            }
            if (!_includes2(item, set4._items[type3])) {
              if (shouldAdd) {
                set4._items[type3].push(item);
              }
              return false;
            }
            return true;
          }
        case "undefined":
          if (set4._items[type3]) {
            return true;
          } else {
            if (shouldAdd) {
              set4._items[type3] = true;
            }
            return false;
          }
        case "object":
          if (item === null) {
            if (!set4._items["null"]) {
              if (shouldAdd) {
                set4._items["null"] = true;
              }
              return false;
            }
            return true;
          }
        default:
          type3 = Object.prototype.toString.call(item);
          if (!(type3 in set4._items)) {
            if (shouldAdd) {
              set4._items[type3] = [item];
            }
            return false;
          }
          if (!_includes2(item, set4._items[type3])) {
            if (shouldAdd) {
              set4._items[type3].push(item);
            }
            return false;
          }
          return true;
      }
    }
    module.exports = _Set2;
  }
});

// node_modules/ramda/src/difference.js
var require_difference = __commonJS({
  "node_modules/ramda/src/difference.js"(exports, module) {
    var _curry22 = require_curry2();
    var _Set2 = require_Set();
    var difference4 = /* @__PURE__ */ _curry22(function difference5(first, second) {
      var out = [];
      var idx = 0;
      var firstLen = first.length;
      var secondLen = second.length;
      var toFilterOut = new _Set2();
      for (var i = 0; i < secondLen; i += 1) {
        toFilterOut.add(second[i]);
      }
      while (idx < firstLen) {
        if (toFilterOut.add(first[idx])) {
          out[out.length] = first[idx];
        }
        idx += 1;
      }
      return out;
    });
    module.exports = difference4;
  }
});

// node_modules/ramda/src/differenceWith.js
var require_differenceWith = __commonJS({
  "node_modules/ramda/src/differenceWith.js"(exports, module) {
    var _includesWith2 = require_includesWith();
    var _curry32 = require_curry3();
    var differenceWith3 = /* @__PURE__ */ _curry32(function differenceWith4(pred, first, second) {
      var out = [];
      var idx = 0;
      var firstLen = first.length;
      while (idx < firstLen) {
        if (!_includesWith2(pred, first[idx], second) && !_includesWith2(pred, first[idx], out)) {
          out.push(first[idx]);
        }
        idx += 1;
      }
      return out;
    });
    module.exports = differenceWith3;
  }
});

// node_modules/ramda/src/remove.js
var require_remove = __commonJS({
  "node_modules/ramda/src/remove.js"(exports, module) {
    var _curry32 = require_curry3();
    var remove4 = /* @__PURE__ */ _curry32(function remove5(start, count2, list) {
      var result = Array.prototype.slice.call(list, 0);
      result.splice(start, count2);
      return result;
    });
    module.exports = remove4;
  }
});

// node_modules/ramda/src/internal/_dissoc.js
var require_dissoc = __commonJS({
  "node_modules/ramda/src/internal/_dissoc.js"(exports, module) {
    var _isInteger2 = require_isInteger();
    var _isArray2 = require_isArray();
    var remove4 = require_remove();
    function _dissoc2(prop4, obj) {
      if (obj == null) {
        return obj;
      }
      if (_isInteger2(prop4) && _isArray2(obj)) {
        return remove4(prop4, 1, obj);
      }
      var result = {};
      for (var p in obj) {
        result[p] = obj[p];
      }
      delete result[prop4];
      return result;
    }
    module.exports = _dissoc2;
  }
});

// node_modules/ramda/src/dissocPath.js
var require_dissocPath = __commonJS({
  "node_modules/ramda/src/dissocPath.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dissoc2 = require_dissoc();
    var _isInteger2 = require_isInteger();
    var _isArray2 = require_isArray();
    var assoc3 = require_assoc2();
    function _shallowCloneObject2(prop4, obj) {
      if (_isInteger2(prop4) && _isArray2(obj)) {
        return [].concat(obj);
      }
      var result = {};
      for (var p in obj) {
        result[p] = obj[p];
      }
      return result;
    }
    var dissocPath3 = /* @__PURE__ */ _curry22(function dissocPath4(path3, obj) {
      if (obj == null) {
        return obj;
      }
      switch (path3.length) {
        case 0:
          return obj;
        case 1:
          return _dissoc2(path3[0], obj);
        default:
          var head2 = path3[0];
          var tail2 = Array.prototype.slice.call(path3, 1);
          if (obj[head2] == null) {
            return _shallowCloneObject2(head2, obj);
          } else {
            return assoc3(head2, dissocPath4(tail2, obj[head2]), obj);
          }
      }
    });
    module.exports = dissocPath3;
  }
});

// node_modules/ramda/src/dissoc.js
var require_dissoc2 = __commonJS({
  "node_modules/ramda/src/dissoc.js"(exports, module) {
    var _curry22 = require_curry2();
    var dissocPath3 = require_dissocPath();
    var dissoc3 = /* @__PURE__ */ _curry22(function dissoc4(prop4, obj) {
      return dissocPath3([prop4], obj);
    });
    module.exports = dissoc3;
  }
});

// node_modules/ramda/src/divide.js
var require_divide = __commonJS({
  "node_modules/ramda/src/divide.js"(exports, module) {
    var _curry22 = require_curry2();
    var divide3 = /* @__PURE__ */ _curry22(function divide4(a, b) {
      return a / b;
    });
    module.exports = divide3;
  }
});

// node_modules/ramda/src/internal/_xdrop.js
var require_xdrop = __commonJS({
  "node_modules/ramda/src/internal/_xdrop.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XDrop2 = /* @__PURE__ */ function() {
      function XDrop3(n2, xf) {
        this.xf = xf;
        this.n = n2;
      }
      XDrop3.prototype["@@transducer/init"] = _xfBase.init;
      XDrop3.prototype["@@transducer/result"] = _xfBase.result;
      XDrop3.prototype["@@transducer/step"] = function(result, input) {
        if (this.n > 0) {
          this.n -= 1;
          return result;
        }
        return this.xf["@@transducer/step"](result, input);
      };
      return XDrop3;
    }();
    var _xdrop3 = /* @__PURE__ */ _curry22(function _xdrop4(n2, xf) {
      return new XDrop2(n2, xf);
    });
    module.exports = _xdrop3;
  }
});

// node_modules/ramda/src/drop.js
var require_drop = __commonJS({
  "node_modules/ramda/src/drop.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xdrop3 = require_xdrop();
    var slice4 = require_slice();
    var drop3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["drop"], _xdrop3, function drop4(n2, xs) {
        return slice4(Math.max(0, n2), Infinity, xs);
      })
    );
    module.exports = drop3;
  }
});

// node_modules/ramda/src/internal/_xtake.js
var require_xtake = __commonJS({
  "node_modules/ramda/src/internal/_xtake.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduced2 = require_reduced();
    var _xfBase = require_xfBase();
    var XTake2 = /* @__PURE__ */ function() {
      function XTake3(n2, xf) {
        this.xf = xf;
        this.n = n2;
        this.i = 0;
      }
      XTake3.prototype["@@transducer/init"] = _xfBase.init;
      XTake3.prototype["@@transducer/result"] = _xfBase.result;
      XTake3.prototype["@@transducer/step"] = function(result, input) {
        this.i += 1;
        var ret = this.n === 0 ? result : this.xf["@@transducer/step"](result, input);
        return this.n >= 0 && this.i >= this.n ? _reduced2(ret) : ret;
      };
      return XTake3;
    }();
    var _xtake3 = /* @__PURE__ */ _curry22(function _xtake4(n2, xf) {
      return new XTake2(n2, xf);
    });
    module.exports = _xtake3;
  }
});

// node_modules/ramda/src/take.js
var require_take = __commonJS({
  "node_modules/ramda/src/take.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xtake3 = require_xtake();
    var slice4 = require_slice();
    var take3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["take"], _xtake3, function take4(n2, xs) {
        return slice4(0, n2 < 0 ? Infinity : n2, xs);
      })
    );
    module.exports = take3;
  }
});

// node_modules/ramda/src/internal/_dropLast.js
var require_dropLast = __commonJS({
  "node_modules/ramda/src/internal/_dropLast.js"(exports, module) {
    var take3 = require_take();
    function dropLast3(n2, xs) {
      return take3(n2 < xs.length ? xs.length - n2 : 0, xs);
    }
    module.exports = dropLast3;
  }
});

// node_modules/ramda/src/internal/_xdropLast.js
var require_xdropLast = __commonJS({
  "node_modules/ramda/src/internal/_xdropLast.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XDropLast2 = /* @__PURE__ */ function() {
      function XDropLast3(n2, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n2);
      }
      XDropLast3.prototype["@@transducer/init"] = _xfBase.init;
      XDropLast3.prototype["@@transducer/result"] = function(result) {
        this.acc = null;
        return this.xf["@@transducer/result"](result);
      };
      XDropLast3.prototype["@@transducer/step"] = function(result, input) {
        if (this.full) {
          result = this.xf["@@transducer/step"](result, this.acc[this.pos]);
        }
        this.store(input);
        return result;
      };
      XDropLast3.prototype.store = function(input) {
        this.acc[this.pos] = input;
        this.pos += 1;
        if (this.pos === this.acc.length) {
          this.pos = 0;
          this.full = true;
        }
      };
      return XDropLast3;
    }();
    var _xdropLast3 = /* @__PURE__ */ _curry22(function _xdropLast4(n2, xf) {
      return new XDropLast2(n2, xf);
    });
    module.exports = _xdropLast3;
  }
});

// node_modules/ramda/src/dropLast.js
var require_dropLast2 = __commonJS({
  "node_modules/ramda/src/dropLast.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _dropLast = require_dropLast();
    var _xdropLast3 = require_xdropLast();
    var dropLast3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xdropLast3, _dropLast)
    );
    module.exports = dropLast3;
  }
});

// node_modules/ramda/src/internal/_dropLastWhile.js
var require_dropLastWhile = __commonJS({
  "node_modules/ramda/src/internal/_dropLastWhile.js"(exports, module) {
    var slice4 = require_slice();
    function dropLastWhile3(pred, xs) {
      var idx = xs.length - 1;
      while (idx >= 0 && pred(xs[idx])) {
        idx -= 1;
      }
      return slice4(0, idx + 1, xs);
    }
    module.exports = dropLastWhile3;
  }
});

// node_modules/ramda/src/internal/_xdropLastWhile.js
var require_xdropLastWhile = __commonJS({
  "node_modules/ramda/src/internal/_xdropLastWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduce2 = require_reduce();
    var _xfBase = require_xfBase();
    var XDropLastWhile2 = /* @__PURE__ */ function() {
      function XDropLastWhile3(fn, xf) {
        this.f = fn;
        this.retained = [];
        this.xf = xf;
      }
      XDropLastWhile3.prototype["@@transducer/init"] = _xfBase.init;
      XDropLastWhile3.prototype["@@transducer/result"] = function(result) {
        this.retained = null;
        return this.xf["@@transducer/result"](result);
      };
      XDropLastWhile3.prototype["@@transducer/step"] = function(result, input) {
        return this.f(input) ? this.retain(result, input) : this.flush(result, input);
      };
      XDropLastWhile3.prototype.flush = function(result, input) {
        result = _reduce2(this.xf["@@transducer/step"], result, this.retained);
        this.retained = [];
        return this.xf["@@transducer/step"](result, input);
      };
      XDropLastWhile3.prototype.retain = function(result, input) {
        this.retained.push(input);
        return result;
      };
      return XDropLastWhile3;
    }();
    var _xdropLastWhile3 = /* @__PURE__ */ _curry22(function _xdropLastWhile4(fn, xf) {
      return new XDropLastWhile2(fn, xf);
    });
    module.exports = _xdropLastWhile3;
  }
});

// node_modules/ramda/src/dropLastWhile.js
var require_dropLastWhile2 = __commonJS({
  "node_modules/ramda/src/dropLastWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _dropLastWhile = require_dropLastWhile();
    var _xdropLastWhile3 = require_xdropLastWhile();
    var dropLastWhile3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xdropLastWhile3, _dropLastWhile)
    );
    module.exports = dropLastWhile3;
  }
});

// node_modules/ramda/src/internal/_xdropRepeatsWith.js
var require_xdropRepeatsWith = __commonJS({
  "node_modules/ramda/src/internal/_xdropRepeatsWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XDropRepeatsWith2 = /* @__PURE__ */ function() {
      function XDropRepeatsWith3(pred, xf) {
        this.xf = xf;
        this.pred = pred;
        this.lastValue = void 0;
        this.seenFirstValue = false;
      }
      XDropRepeatsWith3.prototype["@@transducer/init"] = _xfBase.init;
      XDropRepeatsWith3.prototype["@@transducer/result"] = _xfBase.result;
      XDropRepeatsWith3.prototype["@@transducer/step"] = function(result, input) {
        var sameAsLast = false;
        if (!this.seenFirstValue) {
          this.seenFirstValue = true;
        } else if (this.pred(this.lastValue, input)) {
          sameAsLast = true;
        }
        this.lastValue = input;
        return sameAsLast ? result : this.xf["@@transducer/step"](result, input);
      };
      return XDropRepeatsWith3;
    }();
    var _xdropRepeatsWith3 = /* @__PURE__ */ _curry22(function _xdropRepeatsWith4(pred, xf) {
      return new XDropRepeatsWith2(pred, xf);
    });
    module.exports = _xdropRepeatsWith3;
  }
});

// node_modules/ramda/src/last.js
var require_last = __commonJS({
  "node_modules/ramda/src/last.js"(exports, module) {
    var nth3 = require_nth();
    var last2 = /* @__PURE__ */ nth3(-1);
    module.exports = last2;
  }
});

// node_modules/ramda/src/dropRepeatsWith.js
var require_dropRepeatsWith = __commonJS({
  "node_modules/ramda/src/dropRepeatsWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xdropRepeatsWith3 = require_xdropRepeatsWith();
    var last2 = require_last();
    var dropRepeatsWith3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xdropRepeatsWith3, function dropRepeatsWith4(pred, list) {
        var result = [];
        var idx = 1;
        var len = list.length;
        if (len !== 0) {
          result[0] = list[0];
          while (idx < len) {
            if (!pred(last2(result), list[idx])) {
              result[result.length] = list[idx];
            }
            idx += 1;
          }
        }
        return result;
      })
    );
    module.exports = dropRepeatsWith3;
  }
});

// node_modules/ramda/src/dropRepeats.js
var require_dropRepeats = __commonJS({
  "node_modules/ramda/src/dropRepeats.js"(exports, module) {
    var _curry12 = require_curry1();
    var _dispatchable2 = require_dispatchable();
    var _xdropRepeatsWith3 = require_xdropRepeatsWith();
    var dropRepeatsWith3 = require_dropRepeatsWith();
    var equals4 = require_equals2();
    var dropRepeats2 = /* @__PURE__ */ _curry12(
      /* @__PURE__ */ _dispatchable2(
        [],
        /* @__PURE__ */ _xdropRepeatsWith3(equals4),
        /* @__PURE__ */ dropRepeatsWith3(equals4)
      )
    );
    module.exports = dropRepeats2;
  }
});

// node_modules/ramda/src/internal/_xdropWhile.js
var require_xdropWhile = __commonJS({
  "node_modules/ramda/src/internal/_xdropWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XDropWhile2 = /* @__PURE__ */ function() {
      function XDropWhile3(f, xf) {
        this.xf = xf;
        this.f = f;
      }
      XDropWhile3.prototype["@@transducer/init"] = _xfBase.init;
      XDropWhile3.prototype["@@transducer/result"] = _xfBase.result;
      XDropWhile3.prototype["@@transducer/step"] = function(result, input) {
        if (this.f) {
          if (this.f(input)) {
            return result;
          }
          this.f = null;
        }
        return this.xf["@@transducer/step"](result, input);
      };
      return XDropWhile3;
    }();
    var _xdropWhile3 = /* @__PURE__ */ _curry22(function _xdropWhile4(f, xf) {
      return new XDropWhile2(f, xf);
    });
    module.exports = _xdropWhile3;
  }
});

// node_modules/ramda/src/dropWhile.js
var require_dropWhile = __commonJS({
  "node_modules/ramda/src/dropWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xdropWhile3 = require_xdropWhile();
    var slice4 = require_slice();
    var dropWhile3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["dropWhile"], _xdropWhile3, function dropWhile4(pred, xs) {
        var idx = 0;
        var len = xs.length;
        while (idx < len && pred(xs[idx])) {
          idx += 1;
        }
        return slice4(idx, Infinity, xs);
      })
    );
    module.exports = dropWhile3;
  }
});

// node_modules/ramda/src/or.js
var require_or = __commonJS({
  "node_modules/ramda/src/or.js"(exports, module) {
    var _curry22 = require_curry2();
    var or3 = /* @__PURE__ */ _curry22(function or4(a, b) {
      return a || b;
    });
    module.exports = or3;
  }
});

// node_modules/ramda/src/either.js
var require_either = __commonJS({
  "node_modules/ramda/src/either.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isFunction2 = require_isFunction();
    var lift3 = require_lift();
    var or3 = require_or();
    var either3 = /* @__PURE__ */ _curry22(function either4(f, g2) {
      return _isFunction2(f) ? function _either() {
        return f.apply(this, arguments) || g2.apply(this, arguments);
      } : lift3(or3)(f, g2);
    });
    module.exports = either3;
  }
});

// node_modules/ramda/src/internal/_isTypedArray.js
var require_isTypedArray = __commonJS({
  "node_modules/ramda/src/internal/_isTypedArray.js"(exports, module) {
    function _isTypedArray2(val) {
      var type3 = Object.prototype.toString.call(val);
      return type3 === "[object Uint8ClampedArray]" || type3 === "[object Int8Array]" || type3 === "[object Uint8Array]" || type3 === "[object Int16Array]" || type3 === "[object Uint16Array]" || type3 === "[object Int32Array]" || type3 === "[object Uint32Array]" || type3 === "[object Float32Array]" || type3 === "[object Float64Array]" || type3 === "[object BigInt64Array]" || type3 === "[object BigUint64Array]";
    }
    module.exports = _isTypedArray2;
  }
});

// node_modules/ramda/src/empty.js
var require_empty = __commonJS({
  "node_modules/ramda/src/empty.js"(exports, module) {
    var _curry12 = require_curry1();
    var _isArguments2 = require_isArguments();
    var _isArray2 = require_isArray();
    var _isObject2 = require_isObject();
    var _isString2 = require_isString();
    var _isTypedArray2 = require_isTypedArray();
    var empty3 = /* @__PURE__ */ _curry12(function empty4(x) {
      return x != null && typeof x["fantasy-land/empty"] === "function" ? x["fantasy-land/empty"]() : x != null && x.constructor != null && typeof x.constructor["fantasy-land/empty"] === "function" ? x.constructor["fantasy-land/empty"]() : x != null && typeof x.empty === "function" ? x.empty() : x != null && x.constructor != null && typeof x.constructor.empty === "function" ? x.constructor.empty() : _isArray2(x) ? [] : _isString2(x) ? "" : _isObject2(x) ? {} : _isArguments2(x) ? function() {
        return arguments;
      }() : _isTypedArray2(x) ? x.constructor.from("") : void 0;
    });
    module.exports = empty3;
  }
});

// node_modules/ramda/src/takeLast.js
var require_takeLast = __commonJS({
  "node_modules/ramda/src/takeLast.js"(exports, module) {
    var _curry22 = require_curry2();
    var drop3 = require_drop();
    var takeLast3 = /* @__PURE__ */ _curry22(function takeLast4(n2, xs) {
      return drop3(n2 >= 0 ? xs.length - n2 : 0, xs);
    });
    module.exports = takeLast3;
  }
});

// node_modules/ramda/src/endsWith.js
var require_endsWith = __commonJS({
  "node_modules/ramda/src/endsWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var equals4 = require_equals2();
    var takeLast3 = require_takeLast();
    var endsWith2 = /* @__PURE__ */ _curry22(function(suffix, list) {
      return equals4(takeLast3(suffix.length, list), suffix);
    });
    module.exports = endsWith2;
  }
});

// node_modules/ramda/src/eqBy.js
var require_eqBy = __commonJS({
  "node_modules/ramda/src/eqBy.js"(exports, module) {
    var _curry32 = require_curry3();
    var equals4 = require_equals2();
    var eqBy3 = /* @__PURE__ */ _curry32(function eqBy4(f, x, y) {
      return equals4(f(x), f(y));
    });
    module.exports = eqBy3;
  }
});

// node_modules/ramda/src/eqProps.js
var require_eqProps = __commonJS({
  "node_modules/ramda/src/eqProps.js"(exports, module) {
    var _curry32 = require_curry3();
    var equals4 = require_equals2();
    var eqProps3 = /* @__PURE__ */ _curry32(function eqProps4(prop4, obj1, obj2) {
      return equals4(obj1[prop4], obj2[prop4]);
    });
    module.exports = eqProps3;
  }
});

// node_modules/ramda/src/evolve.js
var require_evolve = __commonJS({
  "node_modules/ramda/src/evolve.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isArray2 = require_isArray();
    var _isObject2 = require_isObject();
    var evolve4 = /* @__PURE__ */ _curry22(function evolve5(transformations, object) {
      if (!_isObject2(object) && !_isArray2(object)) {
        return object;
      }
      var result = object instanceof Array ? [] : {};
      var transformation, key, type3;
      for (key in object) {
        transformation = transformations[key];
        type3 = typeof transformation;
        result[key] = type3 === "function" ? transformation(object[key]) : transformation && type3 === "object" ? evolve5(transformation, object[key]) : object[key];
      }
      return result;
    });
    module.exports = evolve4;
  }
});

// node_modules/ramda/src/internal/_xfind.js
var require_xfind = __commonJS({
  "node_modules/ramda/src/internal/_xfind.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduced2 = require_reduced();
    var _xfBase = require_xfBase();
    var XFind2 = /* @__PURE__ */ function() {
      function XFind3(f, xf) {
        this.xf = xf;
        this.f = f;
        this.found = false;
      }
      XFind3.prototype["@@transducer/init"] = _xfBase.init;
      XFind3.prototype["@@transducer/result"] = function(result) {
        if (!this.found) {
          result = this.xf["@@transducer/step"](result, void 0);
        }
        return this.xf["@@transducer/result"](result);
      };
      XFind3.prototype["@@transducer/step"] = function(result, input) {
        if (this.f(input)) {
          this.found = true;
          result = _reduced2(this.xf["@@transducer/step"](result, input));
        }
        return result;
      };
      return XFind3;
    }();
    var _xfind3 = /* @__PURE__ */ _curry22(function _xfind4(f, xf) {
      return new XFind2(f, xf);
    });
    module.exports = _xfind3;
  }
});

// node_modules/ramda/src/find.js
var require_find = __commonJS({
  "node_modules/ramda/src/find.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xfind3 = require_xfind();
    var find3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["find"], _xfind3, function find4(fn, list) {
        var idx = 0;
        var len = list.length;
        while (idx < len) {
          if (fn(list[idx])) {
            return list[idx];
          }
          idx += 1;
        }
      })
    );
    module.exports = find3;
  }
});

// node_modules/ramda/src/internal/_xfindIndex.js
var require_xfindIndex = __commonJS({
  "node_modules/ramda/src/internal/_xfindIndex.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduced2 = require_reduced();
    var _xfBase = require_xfBase();
    var XFindIndex2 = /* @__PURE__ */ function() {
      function XFindIndex3(f, xf) {
        this.xf = xf;
        this.f = f;
        this.idx = -1;
        this.found = false;
      }
      XFindIndex3.prototype["@@transducer/init"] = _xfBase.init;
      XFindIndex3.prototype["@@transducer/result"] = function(result) {
        if (!this.found) {
          result = this.xf["@@transducer/step"](result, -1);
        }
        return this.xf["@@transducer/result"](result);
      };
      XFindIndex3.prototype["@@transducer/step"] = function(result, input) {
        this.idx += 1;
        if (this.f(input)) {
          this.found = true;
          result = _reduced2(this.xf["@@transducer/step"](result, this.idx));
        }
        return result;
      };
      return XFindIndex3;
    }();
    var _xfindIndex3 = /* @__PURE__ */ _curry22(function _xfindIndex4(f, xf) {
      return new XFindIndex2(f, xf);
    });
    module.exports = _xfindIndex3;
  }
});

// node_modules/ramda/src/findIndex.js
var require_findIndex = __commonJS({
  "node_modules/ramda/src/findIndex.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xfindIndex3 = require_xfindIndex();
    var findIndex4 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xfindIndex3, function findIndex5(fn, list) {
        var idx = 0;
        var len = list.length;
        while (idx < len) {
          if (fn(list[idx])) {
            return idx;
          }
          idx += 1;
        }
        return -1;
      })
    );
    module.exports = findIndex4;
  }
});

// node_modules/ramda/src/internal/_xfindLast.js
var require_xfindLast = __commonJS({
  "node_modules/ramda/src/internal/_xfindLast.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XFindLast2 = /* @__PURE__ */ function() {
      function XFindLast3(f, xf) {
        this.xf = xf;
        this.f = f;
      }
      XFindLast3.prototype["@@transducer/init"] = _xfBase.init;
      XFindLast3.prototype["@@transducer/result"] = function(result) {
        return this.xf["@@transducer/result"](this.xf["@@transducer/step"](result, this.last));
      };
      XFindLast3.prototype["@@transducer/step"] = function(result, input) {
        if (this.f(input)) {
          this.last = input;
        }
        return result;
      };
      return XFindLast3;
    }();
    var _xfindLast3 = /* @__PURE__ */ _curry22(function _xfindLast4(f, xf) {
      return new XFindLast2(f, xf);
    });
    module.exports = _xfindLast3;
  }
});

// node_modules/ramda/src/findLast.js
var require_findLast = __commonJS({
  "node_modules/ramda/src/findLast.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xfindLast3 = require_xfindLast();
    var findLast3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xfindLast3, function findLast4(fn, list) {
        var idx = list.length - 1;
        while (idx >= 0) {
          if (fn(list[idx])) {
            return list[idx];
          }
          idx -= 1;
        }
      })
    );
    module.exports = findLast3;
  }
});

// node_modules/ramda/src/internal/_xfindLastIndex.js
var require_xfindLastIndex = __commonJS({
  "node_modules/ramda/src/internal/_xfindLastIndex.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XFindLastIndex2 = /* @__PURE__ */ function() {
      function XFindLastIndex3(f, xf) {
        this.xf = xf;
        this.f = f;
        this.idx = -1;
        this.lastIdx = -1;
      }
      XFindLastIndex3.prototype["@@transducer/init"] = _xfBase.init;
      XFindLastIndex3.prototype["@@transducer/result"] = function(result) {
        return this.xf["@@transducer/result"](this.xf["@@transducer/step"](result, this.lastIdx));
      };
      XFindLastIndex3.prototype["@@transducer/step"] = function(result, input) {
        this.idx += 1;
        if (this.f(input)) {
          this.lastIdx = this.idx;
        }
        return result;
      };
      return XFindLastIndex3;
    }();
    var _xfindLastIndex3 = /* @__PURE__ */ _curry22(function _xfindLastIndex4(f, xf) {
      return new XFindLastIndex2(f, xf);
    });
    module.exports = _xfindLastIndex3;
  }
});

// node_modules/ramda/src/findLastIndex.js
var require_findLastIndex = __commonJS({
  "node_modules/ramda/src/findLastIndex.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xfindLastIndex3 = require_xfindLastIndex();
    var findLastIndex3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xfindLastIndex3, function findLastIndex4(fn, list) {
        var idx = list.length - 1;
        while (idx >= 0) {
          if (fn(list[idx])) {
            return idx;
          }
          idx -= 1;
        }
        return -1;
      })
    );
    module.exports = findLastIndex3;
  }
});

// node_modules/ramda/src/flatten.js
var require_flatten = __commonJS({
  "node_modules/ramda/src/flatten.js"(exports, module) {
    var _curry12 = require_curry1();
    var _makeFlat2 = require_makeFlat();
    var flatten2 = /* @__PURE__ */ _curry12(
      /* @__PURE__ */ _makeFlat2(true)
    );
    module.exports = flatten2;
  }
});

// node_modules/ramda/src/flip.js
var require_flip = __commonJS({
  "node_modules/ramda/src/flip.js"(exports, module) {
    var _curry12 = require_curry1();
    var curryN3 = require_curryN2();
    var flip3 = /* @__PURE__ */ _curry12(function flip4(fn) {
      return curryN3(fn.length, function(a, b) {
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = b;
        args[1] = a;
        return fn.apply(this, args);
      });
    });
    module.exports = flip3;
  }
});

// node_modules/ramda/src/forEach.js
var require_forEach = __commonJS({
  "node_modules/ramda/src/forEach.js"(exports, module) {
    var _checkForMethod2 = require_checkForMethod();
    var _curry22 = require_curry2();
    var forEach3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _checkForMethod2("forEach", function forEach4(fn, list) {
      var len = list.length;
      var idx = 0;
      while (idx < len) {
        fn(list[idx]);
        idx += 1;
      }
      return list;
    })
  );
    module.exports = forEach3;
  }
});

// node_modules/ramda/src/forEachObjIndexed.js
var require_forEachObjIndexed = __commonJS({
  "node_modules/ramda/src/forEachObjIndexed.js"(exports, module) {
    var _curry22 = require_curry2();
    var keys6 = require_keys();
    var forEachObjIndexed3 = /* @__PURE__ */ _curry22(function forEachObjIndexed4(fn, obj) {
      var keyList = keys6(obj);
      var idx = 0;
      while (idx < keyList.length) {
        var key = keyList[idx];
        fn(obj[key], key, obj);
        idx += 1;
      }
      return obj;
    });
    module.exports = forEachObjIndexed3;
  }
});

// node_modules/ramda/src/fromPairs.js
var require_fromPairs = __commonJS({
  "node_modules/ramda/src/fromPairs.js"(exports, module) {
    var _curry12 = require_curry1();
    var fromPairs3 = /* @__PURE__ */ _curry12(function fromPairs4(pairs) {
      var result = {};
      var idx = 0;
      while (idx < pairs.length) {
        result[pairs[idx][0]] = pairs[idx][1];
        idx += 1;
      }
      return result;
    });
    module.exports = fromPairs3;
  }
});

// node_modules/ramda/src/groupBy.js
var require_groupBy = __commonJS({
  "node_modules/ramda/src/groupBy.js"(exports, module) {
    var _checkForMethod2 = require_checkForMethod();
    var _curry22 = require_curry2();
    var reduceBy3 = require_reduceBy();
    var groupBy2 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _checkForMethod2(
        "groupBy",
      /* @__PURE__ */ reduceBy3(function(acc, item) {
      acc.push(item);
      return acc;
    }, [])
  )
  );
    module.exports = groupBy2;
  }
});

// node_modules/ramda/src/groupWith.js
var require_groupWith = __commonJS({
  "node_modules/ramda/src/groupWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var groupWith2 = /* @__PURE__ */ _curry22(function(fn, list) {
      var res = [];
      var idx = 0;
      var len = list.length;
      while (idx < len) {
        var nextidx = idx + 1;
        while (nextidx < len && fn(list[nextidx - 1], list[nextidx])) {
          nextidx += 1;
        }
        res.push(list.slice(idx, nextidx));
        idx = nextidx;
      }
      return res;
    });
    module.exports = groupWith2;
  }
});

// node_modules/ramda/src/gt.js
var require_gt = __commonJS({
  "node_modules/ramda/src/gt.js"(exports, module) {
    var _curry22 = require_curry2();
    var gt3 = /* @__PURE__ */ _curry22(function gt4(a, b) {
      return a > b;
    });
    module.exports = gt3;
  }
});

// node_modules/ramda/src/gte.js
var require_gte = __commonJS({
  "node_modules/ramda/src/gte.js"(exports, module) {
    var _curry22 = require_curry2();
    var gte3 = /* @__PURE__ */ _curry22(function gte4(a, b) {
      return a >= b;
    });
    module.exports = gte3;
  }
});

// node_modules/ramda/src/hasPath.js
var require_hasPath = __commonJS({
  "node_modules/ramda/src/hasPath.js"(exports, module) {
    var _curry22 = require_curry2();
    var _has2 = require_has();
    var isNil4 = require_isNil();
    var hasPath4 = /* @__PURE__ */ _curry22(function hasPath5(_path, obj) {
      if (_path.length === 0 || isNil4(obj)) {
        return false;
      }
      var val = obj;
      var idx = 0;
      while (idx < _path.length) {
        if (!isNil4(val) && _has2(_path[idx], val)) {
          val = val[_path[idx]];
          idx += 1;
        } else {
          return false;
        }
      }
      return true;
    });
    module.exports = hasPath4;
  }
});

// node_modules/ramda/src/has.js
var require_has2 = __commonJS({
  "node_modules/ramda/src/has.js"(exports, module) {
    var _curry22 = require_curry2();
    var hasPath4 = require_hasPath();
    var has3 = /* @__PURE__ */ _curry22(function has4(prop4, obj) {
      return hasPath4([prop4], obj);
    });
    module.exports = has3;
  }
});

// node_modules/ramda/src/hasIn.js
var require_hasIn = __commonJS({
  "node_modules/ramda/src/hasIn.js"(exports, module) {
    var _curry22 = require_curry2();
    var isNil4 = require_isNil();
    var hasIn3 = /* @__PURE__ */ _curry22(function hasIn4(prop4, obj) {
      if (isNil4(obj)) {
        return false;
      }
      return prop4 in obj;
    });
    module.exports = hasIn3;
  }
});

// node_modules/ramda/src/identical.js
var require_identical = __commonJS({
  "node_modules/ramda/src/identical.js"(exports, module) {
    var _objectIs2 = require_objectIs();
    var _curry22 = require_curry2();
    var identical2 = /* @__PURE__ */ _curry22(_objectIs2);
    module.exports = identical2;
  }
});

// node_modules/ramda/src/ifElse.js
var require_ifElse = __commonJS({
  "node_modules/ramda/src/ifElse.js"(exports, module) {
    var _curry32 = require_curry3();
    var curryN3 = require_curryN2();
    var ifElse3 = /* @__PURE__ */ _curry32(function ifElse4(condition, onTrue, onFalse) {
      return curryN3(Math.max(condition.length, onTrue.length, onFalse.length), function _ifElse() {
        return condition.apply(this, arguments) ? onTrue.apply(this, arguments) : onFalse.apply(this, arguments);
      });
    });
    module.exports = ifElse3;
  }
});

// node_modules/ramda/src/inc.js
var require_inc = __commonJS({
  "node_modules/ramda/src/inc.js"(exports, module) {
    var add4 = require_add();
    var inc2 = /* @__PURE__ */ add4(1);
    module.exports = inc2;
  }
});

// node_modules/ramda/src/includes.js
var require_includes2 = __commonJS({
  "node_modules/ramda/src/includes.js"(exports, module) {
    var _includes2 = require_includes();
    var _curry22 = require_curry2();
    var includes2 = /* @__PURE__ */ _curry22(_includes2);
    module.exports = includes2;
  }
});

// node_modules/ramda/src/indexBy.js
var require_indexBy = __commonJS({
  "node_modules/ramda/src/indexBy.js"(exports, module) {
    var reduceBy3 = require_reduceBy();
    var indexBy2 = /* @__PURE__ */ reduceBy3(function(acc, elem) {
      return elem;
    }, null);
    module.exports = indexBy2;
  }
});

// node_modules/ramda/src/indexOf.js
var require_indexOf2 = __commonJS({
  "node_modules/ramda/src/indexOf.js"(exports, module) {
    var _curry22 = require_curry2();
    var _indexOf2 = require_indexOf();
    var _isArray2 = require_isArray();
    var indexOf4 = /* @__PURE__ */ _curry22(function indexOf5(target, xs) {
      return typeof xs.indexOf === "function" && !_isArray2(xs) ? xs.indexOf(target) : _indexOf2(xs, target, 0);
    });
    module.exports = indexOf4;
  }
});

// node_modules/ramda/src/init.js
var require_init = __commonJS({
  "node_modules/ramda/src/init.js"(exports, module) {
    var slice4 = require_slice();
    var init2 = /* @__PURE__ */ slice4(0, -1);
    module.exports = init2;
  }
});

// node_modules/ramda/src/innerJoin.js
var require_innerJoin = __commonJS({
  "node_modules/ramda/src/innerJoin.js"(exports, module) {
    var _includesWith2 = require_includesWith();
    var _curry32 = require_curry3();
    var _filter2 = require_filter();
    var innerJoin3 = /* @__PURE__ */ _curry32(function innerJoin4(pred, xs, ys) {
      return _filter2(function(x) {
        return _includesWith2(pred, x, ys);
      }, xs);
    });
    module.exports = innerJoin3;
  }
});

// node_modules/ramda/src/insert.js
var require_insert = __commonJS({
  "node_modules/ramda/src/insert.js"(exports, module) {
    var _curry32 = require_curry3();
    var insert3 = /* @__PURE__ */ _curry32(function insert4(idx, elt, list) {
      idx = idx < list.length && idx >= 0 ? idx : list.length;
      var result = Array.prototype.slice.call(list, 0);
      result.splice(idx, 0, elt);
      return result;
    });
    module.exports = insert3;
  }
});

// node_modules/ramda/src/insertAll.js
var require_insertAll = __commonJS({
  "node_modules/ramda/src/insertAll.js"(exports, module) {
    var _curry32 = require_curry3();
    var insertAll3 = /* @__PURE__ */ _curry32(function insertAll4(idx, elts, list) {
      idx = idx < list.length && idx >= 0 ? idx : list.length;
      return [].concat(Array.prototype.slice.call(list, 0, idx), elts, Array.prototype.slice.call(list, idx));
    });
    module.exports = insertAll3;
  }
});

// node_modules/ramda/src/internal/_xuniqBy.js
var require_xuniqBy = __commonJS({
  "node_modules/ramda/src/internal/_xuniqBy.js"(exports, module) {
    var _curry22 = require_curry2();
    var _Set2 = require_Set();
    var _xfBase = require_xfBase();
    var XUniqBy2 = /* @__PURE__ */ function() {
      function XUniqBy3(f, xf) {
        this.xf = xf;
        this.f = f;
        this.set = new _Set2();
      }
      XUniqBy3.prototype["@@transducer/init"] = _xfBase.init;
      XUniqBy3.prototype["@@transducer/result"] = _xfBase.result;
      XUniqBy3.prototype["@@transducer/step"] = function(result, input) {
        return this.set.add(this.f(input)) ? this.xf["@@transducer/step"](result, input) : result;
      };
      return XUniqBy3;
    }();
    var _xuniqBy3 = /* @__PURE__ */ _curry22(function _xuniqBy4(f, xf) {
      return new XUniqBy2(f, xf);
    });
    module.exports = _xuniqBy3;
  }
});

// node_modules/ramda/src/uniqBy.js
var require_uniqBy = __commonJS({
  "node_modules/ramda/src/uniqBy.js"(exports, module) {
    var _Set2 = require_Set();
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xuniqBy3 = require_xuniqBy();
    var uniqBy2 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xuniqBy3, function(fn, list) {
        var set4 = new _Set2();
        var result = [];
        var idx = 0;
        var appliedItem, item;
        while (idx < list.length) {
          item = list[idx];
          appliedItem = fn(item);
          if (set4.add(appliedItem)) {
            result.push(item);
          }
          idx += 1;
        }
        return result;
      })
    );
    module.exports = uniqBy2;
  }
});

// node_modules/ramda/src/uniq.js
var require_uniq = __commonJS({
  "node_modules/ramda/src/uniq.js"(exports, module) {
    var identity2 = require_identity2();
    var uniqBy2 = require_uniqBy();
    var uniq3 = /* @__PURE__ */ uniqBy2(identity2);
    module.exports = uniq3;
  }
});

// node_modules/ramda/src/intersection.js
var require_intersection = __commonJS({
  "node_modules/ramda/src/intersection.js"(exports, module) {
    var _includes2 = require_includes();
    var _curry22 = require_curry2();
    var _filter2 = require_filter();
    var flip3 = require_flip();
    var uniq3 = require_uniq();
    var intersection4 = /* @__PURE__ */ _curry22(function intersection5(list1, list2) {
      var lookupList, filteredList;
      if (list1.length > list2.length) {
        lookupList = list1;
        filteredList = list2;
      } else {
        lookupList = list2;
        filteredList = list1;
      }
      return uniq3(_filter2(flip3(_includes2)(lookupList), filteredList));
    });
    module.exports = intersection4;
  }
});

// node_modules/ramda/src/intersperse.js
var require_intersperse = __commonJS({
  "node_modules/ramda/src/intersperse.js"(exports, module) {
    var _checkForMethod2 = require_checkForMethod();
    var _curry22 = require_curry2();
    var intersperse3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _checkForMethod2("intersperse", function intersperse4(separator, list) {
      var out = [];
      var idx = 0;
      var length3 = list.length;
      while (idx < length3) {
        if (idx === length3 - 1) {
          out.push(list[idx]);
        } else {
          out.push(list[idx], separator);
        }
        idx += 1;
      }
      return out;
    })
  );
    module.exports = intersperse3;
  }
});

// node_modules/ramda/src/internal/_objectAssign.js
var require_objectAssign = __commonJS({
  "node_modules/ramda/src/internal/_objectAssign.js"(exports, module) {
    var _has2 = require_has();
    function _objectAssign2(target) {
      if (target == null) {
        throw new TypeError("Cannot convert undefined or null to object");
      }
      var output = Object(target);
      var idx = 1;
      var length3 = arguments.length;
      while (idx < length3) {
        var source = arguments[idx];
        if (source != null) {
          for (var nextKey in source) {
            if (_has2(nextKey, source)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
        idx += 1;
      }
      return output;
    }
    module.exports = typeof Object.assign === "function" ? Object.assign : _objectAssign2;
  }
});

// node_modules/ramda/src/objOf.js
var require_objOf = __commonJS({
  "node_modules/ramda/src/objOf.js"(exports, module) {
    var _curry22 = require_curry2();
    var objOf3 = /* @__PURE__ */ _curry22(function objOf4(key, val) {
      var obj = {};
      obj[key] = val;
      return obj;
    });
    module.exports = objOf3;
  }
});

// node_modules/ramda/src/internal/_stepCat.js
var require_stepCat = __commonJS({
  "node_modules/ramda/src/internal/_stepCat.js"(exports, module) {
    var _objectAssign2 = require_objectAssign();
    var _identity2 = require_identity();
    var _isArrayLike2 = require_isArrayLike();
    var _isTransformer2 = require_isTransformer();
    var objOf3 = require_objOf();
    var _stepCatArray2 = {
      "@@transducer/init": Array,
      "@@transducer/step": function(xs, x) {
        xs.push(x);
        return xs;
      },
      "@@transducer/result": _identity2
    };
    var _stepCatString2 = {
      "@@transducer/init": String,
      "@@transducer/step": function(a, b) {
        return a + b;
      },
      "@@transducer/result": _identity2
    };
    var _stepCatObject2 = {
      "@@transducer/init": Object,
      "@@transducer/step": function(result, input) {
        return _objectAssign2(result, _isArrayLike2(input) ? objOf3(input[0], input[1]) : input);
      },
      "@@transducer/result": _identity2
    };
    function _stepCat2(obj) {
      if (_isTransformer2(obj)) {
        return obj;
      }
      if (_isArrayLike2(obj)) {
        return _stepCatArray2;
      }
      if (typeof obj === "string") {
        return _stepCatString2;
      }
      if (typeof obj === "object") {
        return _stepCatObject2;
      }
      throw new Error("Cannot create transformer for " + obj);
    }
    module.exports = _stepCat2;
  }
});

// node_modules/ramda/src/into.js
var require_into = __commonJS({
  "node_modules/ramda/src/into.js"(exports, module) {
    var _clone2 = require_clone();
    var _curry32 = require_curry3();
    var _isTransformer2 = require_isTransformer();
    var _reduce2 = require_reduce();
    var _stepCat2 = require_stepCat();
    var into3 = /* @__PURE__ */ _curry32(function into4(acc, xf, list) {
      return _isTransformer2(acc) ? _reduce2(xf(acc), acc["@@transducer/init"](), list) : _reduce2(xf(_stepCat2(acc)), _clone2(acc, [], [], false), list);
    });
    module.exports = into3;
  }
});

// node_modules/ramda/src/invert.js
var require_invert = __commonJS({
  "node_modules/ramda/src/invert.js"(exports, module) {
    var _curry12 = require_curry1();
    var _has2 = require_has();
    var keys6 = require_keys();
    var invert3 = /* @__PURE__ */ _curry12(function invert4(obj) {
      var props3 = keys6(obj);
      var len = props3.length;
      var idx = 0;
      var out = {};
      while (idx < len) {
        var key = props3[idx];
        var val = obj[key];
        var list = _has2(val, out) ? out[val] : out[val] = [];
        list[list.length] = key;
        idx += 1;
      }
      return out;
    });
    module.exports = invert3;
  }
});

// node_modules/ramda/src/invertObj.js
var require_invertObj = __commonJS({
  "node_modules/ramda/src/invertObj.js"(exports, module) {
    var _curry12 = require_curry1();
    var keys6 = require_keys();
    var invertObj3 = /* @__PURE__ */ _curry12(function invertObj4(obj) {
      var props3 = keys6(obj);
      var len = props3.length;
      var idx = 0;
      var out = {};
      while (idx < len) {
        var key = props3[idx];
        out[obj[key]] = key;
        idx += 1;
      }
      return out;
    });
    module.exports = invertObj3;
  }
});

// node_modules/ramda/src/invoker.js
var require_invoker = __commonJS({
  "node_modules/ramda/src/invoker.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isFunction2 = require_isFunction();
    var curryN3 = require_curryN2();
    var toString4 = require_toString2();
    var invoker3 = /* @__PURE__ */ _curry22(function invoker4(arity, method) {
      return curryN3(arity + 1, function() {
        var target = arguments[arity];
        if (target != null && _isFunction2(target[method])) {
          return target[method].apply(target, Array.prototype.slice.call(arguments, 0, arity));
        }
        throw new TypeError(toString4(target) + ' does not have a method named "' + method + '"');
      });
    });
    module.exports = invoker3;
  }
});

// node_modules/ramda/src/is.js
var require_is = __commonJS({
  "node_modules/ramda/src/is.js"(exports, module) {
    var _curry22 = require_curry2();
    var is4 = /* @__PURE__ */ _curry22(function is5(Ctor, val) {
      return val instanceof Ctor || val != null && (val.constructor === Ctor || Ctor.name === "Object" && typeof val === "object");
    });
    module.exports = is4;
  }
});

// node_modules/ramda/src/isEmpty.js
var require_isEmpty = __commonJS({
  "node_modules/ramda/src/isEmpty.js"(exports, module) {
    var _curry12 = require_curry1();
    var empty3 = require_empty();
    var equals4 = require_equals2();
    var isEmpty3 = /* @__PURE__ */ _curry12(function isEmpty4(x) {
      return x != null && equals4(x, empty3(x));
    });
    module.exports = isEmpty3;
  }
});

// node_modules/ramda/src/join.js
var require_join = __commonJS({
  "node_modules/ramda/src/join.js"(exports, module) {
    var invoker3 = require_invoker();
    var join2 = /* @__PURE__ */ invoker3(1, "join");
    module.exports = join2;
  }
});

// node_modules/ramda/src/juxt.js
var require_juxt = __commonJS({
  "node_modules/ramda/src/juxt.js"(exports, module) {
    var _curry12 = require_curry1();
    var converge3 = require_converge();
    var juxt3 = /* @__PURE__ */ _curry12(function juxt4(fns) {
      return converge3(function() {
        return Array.prototype.slice.call(arguments, 0);
      }, fns);
    });
    module.exports = juxt3;
  }
});

// node_modules/ramda/src/keysIn.js
var require_keysIn = __commonJS({
  "node_modules/ramda/src/keysIn.js"(exports, module) {
    var _curry12 = require_curry1();
    var keysIn3 = /* @__PURE__ */ _curry12(function keysIn4(obj) {
      var prop4;
      var ks = [];
      for (prop4 in obj) {
        ks[ks.length] = prop4;
      }
      return ks;
    });
    module.exports = keysIn3;
  }
});

// node_modules/ramda/src/lastIndexOf.js
var require_lastIndexOf = __commonJS({
  "node_modules/ramda/src/lastIndexOf.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isArray2 = require_isArray();
    var equals4 = require_equals2();
    var lastIndexOf3 = /* @__PURE__ */ _curry22(function lastIndexOf4(target, xs) {
      if (typeof xs.lastIndexOf === "function" && !_isArray2(xs)) {
        return xs.lastIndexOf(target);
      } else {
        var idx = xs.length - 1;
        while (idx >= 0) {
          if (equals4(xs[idx], target)) {
            return idx;
          }
          idx -= 1;
        }
        return -1;
      }
    });
    module.exports = lastIndexOf3;
  }
});

// node_modules/ramda/src/internal/_isNumber.js
var require_isNumber = __commonJS({
  "node_modules/ramda/src/internal/_isNumber.js"(exports, module) {
    function _isNumber2(x) {
      return Object.prototype.toString.call(x) === "[object Number]";
    }
    module.exports = _isNumber2;
  }
});

// node_modules/ramda/src/length.js
var require_length = __commonJS({
  "node_modules/ramda/src/length.js"(exports, module) {
    var _curry12 = require_curry1();
    var _isNumber2 = require_isNumber();
    var length3 = /* @__PURE__ */ _curry12(function length4(list) {
      return list != null && _isNumber2(list.length) ? list.length : NaN;
    });
    module.exports = length3;
  }
});

// node_modules/ramda/src/lens.js
var require_lens = __commonJS({
  "node_modules/ramda/src/lens.js"(exports, module) {
    var _curry22 = require_curry2();
    var map4 = require_map2();
    var lens3 = /* @__PURE__ */ _curry22(function lens4(getter, setter) {
      return function(toFunctorFn) {
        return function(target) {
          return map4(function(focus) {
            return setter(focus, target);
          }, toFunctorFn(getter(target)));
        };
      };
    });
    module.exports = lens3;
  }
});

// node_modules/ramda/src/update.js
var require_update = __commonJS({
  "node_modules/ramda/src/update.js"(exports, module) {
    var _curry32 = require_curry3();
    var adjust3 = require_adjust();
    var always3 = require_always();
    var update4 = /* @__PURE__ */ _curry32(function update5(idx, x, list) {
      return adjust3(idx, always3(x), list);
    });
    module.exports = update4;
  }
});

// node_modules/ramda/src/lensIndex.js
var require_lensIndex = __commonJS({
  "node_modules/ramda/src/lensIndex.js"(exports, module) {
    var _curry12 = require_curry1();
    var lens3 = require_lens();
    var nth3 = require_nth();
    var update4 = require_update();
    var lensIndex3 = /* @__PURE__ */ _curry12(function lensIndex4(n2) {
      return lens3(nth3(n2), update4(n2));
    });
    module.exports = lensIndex3;
  }
});

// node_modules/ramda/src/paths.js
var require_paths = __commonJS({
  "node_modules/ramda/src/paths.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isInteger2 = require_isInteger();
    var nth3 = require_nth();
    var paths3 = /* @__PURE__ */ _curry22(function paths4(pathsArray, obj) {
      return pathsArray.map(function(paths5) {
        var val = obj;
        var idx = 0;
        var p;
        while (idx < paths5.length) {
          if (val == null) {
            return;
          }
          p = paths5[idx];
          val = _isInteger2(p) ? nth3(p, val) : val[p];
          idx += 1;
        }
        return val;
      });
    });
    module.exports = paths3;
  }
});

// node_modules/ramda/src/path.js
var require_path = __commonJS({
  "node_modules/ramda/src/path.js"(exports, module) {
    var _curry22 = require_curry2();
    var paths3 = require_paths();
    var path3 = /* @__PURE__ */ _curry22(function path4(pathAr, obj) {
      return paths3([pathAr], obj)[0];
    });
    module.exports = path3;
  }
});

// node_modules/ramda/src/lensPath.js
var require_lensPath = __commonJS({
  "node_modules/ramda/src/lensPath.js"(exports, module) {
    var _curry12 = require_curry1();
    var assocPath3 = require_assocPath();
    var lens3 = require_lens();
    var path3 = require_path();
    var lensPath3 = /* @__PURE__ */ _curry12(function lensPath4(p) {
      return lens3(path3(p), assocPath3(p));
    });
    module.exports = lensPath3;
  }
});

// node_modules/ramda/src/lensProp.js
var require_lensProp = __commonJS({
  "node_modules/ramda/src/lensProp.js"(exports, module) {
    var _curry12 = require_curry1();
    var assoc3 = require_assoc2();
    var lens3 = require_lens();
    var prop4 = require_prop();
    var lensProp3 = /* @__PURE__ */ _curry12(function lensProp4(k) {
      return lens3(prop4(k), assoc3(k));
    });
    module.exports = lensProp3;
  }
});

// node_modules/ramda/src/lt.js
var require_lt = __commonJS({
  "node_modules/ramda/src/lt.js"(exports, module) {
    var _curry22 = require_curry2();
    var lt3 = /* @__PURE__ */ _curry22(function lt4(a, b) {
      return a < b;
    });
    module.exports = lt3;
  }
});

// node_modules/ramda/src/lte.js
var require_lte = __commonJS({
  "node_modules/ramda/src/lte.js"(exports, module) {
    var _curry22 = require_curry2();
    var lte3 = /* @__PURE__ */ _curry22(function lte4(a, b) {
      return a <= b;
    });
    module.exports = lte3;
  }
});

// node_modules/ramda/src/mapAccum.js
var require_mapAccum = __commonJS({
  "node_modules/ramda/src/mapAccum.js"(exports, module) {
    var _curry32 = require_curry3();
    var mapAccum3 = /* @__PURE__ */ _curry32(function mapAccum4(fn, acc, list) {
      var idx = 0;
      var len = list.length;
      var result = [];
      var tuple = [acc];
      while (idx < len) {
        tuple = fn(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx += 1;
      }
      return [tuple[0], result];
    });
    module.exports = mapAccum3;
  }
});

// node_modules/ramda/src/mapAccumRight.js
var require_mapAccumRight = __commonJS({
  "node_modules/ramda/src/mapAccumRight.js"(exports, module) {
    var _curry32 = require_curry3();
    var mapAccumRight3 = /* @__PURE__ */ _curry32(function mapAccumRight4(fn, acc, list) {
      var idx = list.length - 1;
      var result = [];
      var tuple = [acc];
      while (idx >= 0) {
        tuple = fn(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx -= 1;
      }
      return [tuple[0], result];
    });
    module.exports = mapAccumRight3;
  }
});

// node_modules/ramda/src/mapObjIndexed.js
var require_mapObjIndexed = __commonJS({
  "node_modules/ramda/src/mapObjIndexed.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduce2 = require_reduce();
    var keys6 = require_keys();
    var mapObjIndexed3 = /* @__PURE__ */ _curry22(function mapObjIndexed4(fn, obj) {
      return _reduce2(function(acc, key) {
        acc[key] = fn(obj[key], key, obj);
        return acc;
      }, {}, keys6(obj));
    });
    module.exports = mapObjIndexed3;
  }
});

// node_modules/ramda/src/match.js
var require_match = __commonJS({
  "node_modules/ramda/src/match.js"(exports, module) {
    var _curry22 = require_curry2();
    var match3 = /* @__PURE__ */ _curry22(function match4(rx, str) {
      return str.match(rx) || [];
    });
    module.exports = match3;
  }
});

// node_modules/ramda/src/mathMod.js
var require_mathMod = __commonJS({
  "node_modules/ramda/src/mathMod.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isInteger2 = require_isInteger();
    var mathMod3 = /* @__PURE__ */ _curry22(function mathMod4(m, p) {
      if (!_isInteger2(m)) {
        return NaN;
      }
      if (!_isInteger2(p) || p < 1) {
        return NaN;
      }
      return (m % p + p) % p;
    });
    module.exports = mathMod3;
  }
});

// node_modules/ramda/src/maxBy.js
var require_maxBy = __commonJS({
  "node_modules/ramda/src/maxBy.js"(exports, module) {
    var _curry32 = require_curry3();
    var maxBy3 = /* @__PURE__ */ _curry32(function maxBy4(f, a, b) {
      return f(b) > f(a) ? b : a;
    });
    module.exports = maxBy3;
  }
});

// node_modules/ramda/src/sum.js
var require_sum = __commonJS({
  "node_modules/ramda/src/sum.js"(exports, module) {
    var add4 = require_add();
    var reduce2 = require_reduce2();
    var sum2 = /* @__PURE__ */ reduce2(add4, 0);
    module.exports = sum2;
  }
});

// node_modules/ramda/src/mean.js
var require_mean = __commonJS({
  "node_modules/ramda/src/mean.js"(exports, module) {
    var _curry12 = require_curry1();
    var sum2 = require_sum();
    var mean3 = /* @__PURE__ */ _curry12(function mean4(list) {
      return sum2(list) / list.length;
    });
    module.exports = mean3;
  }
});

// node_modules/ramda/src/median.js
var require_median = __commonJS({
  "node_modules/ramda/src/median.js"(exports, module) {
    var _curry12 = require_curry1();
    var mean3 = require_mean();
    var median3 = /* @__PURE__ */ _curry12(function median4(list) {
      var len = list.length;
      if (len === 0) {
        return NaN;
      }
      var width = 2 - len % 2;
      var idx = (len - width) / 2;
      return mean3(Array.prototype.slice.call(list, 0).sort(function(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      }).slice(idx, idx + width));
    });
    module.exports = median3;
  }
});

// node_modules/ramda/src/memoizeWith.js
var require_memoizeWith = __commonJS({
  "node_modules/ramda/src/memoizeWith.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry22 = require_curry2();
    var _has2 = require_has();
    var memoizeWith3 = /* @__PURE__ */ _curry22(function memoizeWith4(mFn, fn) {
      var cache = {};
      return _arity2(fn.length, function() {
        var key = mFn.apply(this, arguments);
        if (!_has2(key, cache)) {
          cache[key] = fn.apply(this, arguments);
        }
        return cache[key];
      });
    });
    module.exports = memoizeWith3;
  }
});

// node_modules/ramda/src/mergeAll.js
var require_mergeAll = __commonJS({
  "node_modules/ramda/src/mergeAll.js"(exports, module) {
    var _objectAssign2 = require_objectAssign();
    var _curry12 = require_curry1();
    var mergeAll3 = /* @__PURE__ */ _curry12(function mergeAll4(list) {
      return _objectAssign2.apply(null, [{}].concat(list));
    });
    module.exports = mergeAll3;
  }
});

// node_modules/ramda/src/mergeWithKey.js
var require_mergeWithKey = __commonJS({
  "node_modules/ramda/src/mergeWithKey.js"(exports, module) {
    var _curry32 = require_curry3();
    var _has2 = require_has();
    var mergeWithKey3 = /* @__PURE__ */ _curry32(function mergeWithKey4(fn, l, r) {
      var result = {};
      var k;
      for (k in l) {
        if (_has2(k, l)) {
          result[k] = _has2(k, r) ? fn(k, l[k], r[k]) : l[k];
        }
      }
      for (k in r) {
        if (_has2(k, r) && !_has2(k, result)) {
          result[k] = r[k];
        }
      }
      return result;
    });
    module.exports = mergeWithKey3;
  }
});

// node_modules/ramda/src/mergeDeepWithKey.js
var require_mergeDeepWithKey = __commonJS({
  "node_modules/ramda/src/mergeDeepWithKey.js"(exports, module) {
    var _curry32 = require_curry3();
    var _isObject2 = require_isObject();
    var mergeWithKey3 = require_mergeWithKey();
    var mergeDeepWithKey3 = /* @__PURE__ */ _curry32(function mergeDeepWithKey4(fn, lObj, rObj) {
      return mergeWithKey3(function(k, lVal, rVal) {
        if (_isObject2(lVal) && _isObject2(rVal)) {
          return mergeDeepWithKey4(fn, lVal, rVal);
        } else {
          return fn(k, lVal, rVal);
        }
      }, lObj, rObj);
    });
    module.exports = mergeDeepWithKey3;
  }
});

// node_modules/ramda/src/mergeDeepLeft.js
var require_mergeDeepLeft = __commonJS({
  "node_modules/ramda/src/mergeDeepLeft.js"(exports, module) {
    var _curry22 = require_curry2();
    var mergeDeepWithKey3 = require_mergeDeepWithKey();
    var mergeDeepLeft3 = /* @__PURE__ */ _curry22(function mergeDeepLeft4(lObj, rObj) {
      return mergeDeepWithKey3(function(k, lVal, rVal) {
        return lVal;
      }, lObj, rObj);
    });
    module.exports = mergeDeepLeft3;
  }
});

// node_modules/ramda/src/mergeDeepRight.js
var require_mergeDeepRight = __commonJS({
  "node_modules/ramda/src/mergeDeepRight.js"(exports, module) {
    var _curry22 = require_curry2();
    var mergeDeepWithKey3 = require_mergeDeepWithKey();
    var mergeDeepRight3 = /* @__PURE__ */ _curry22(function mergeDeepRight4(lObj, rObj) {
      return mergeDeepWithKey3(function(k, lVal, rVal) {
        return rVal;
      }, lObj, rObj);
    });
    module.exports = mergeDeepRight3;
  }
});

// node_modules/ramda/src/mergeDeepWith.js
var require_mergeDeepWith = __commonJS({
  "node_modules/ramda/src/mergeDeepWith.js"(exports, module) {
    var _curry32 = require_curry3();
    var mergeDeepWithKey3 = require_mergeDeepWithKey();
    var mergeDeepWith3 = /* @__PURE__ */ _curry32(function mergeDeepWith4(fn, lObj, rObj) {
      return mergeDeepWithKey3(function(k, lVal, rVal) {
        return fn(lVal, rVal);
      }, lObj, rObj);
    });
    module.exports = mergeDeepWith3;
  }
});

// node_modules/ramda/src/mergeLeft.js
var require_mergeLeft = __commonJS({
  "node_modules/ramda/src/mergeLeft.js"(exports, module) {
    var _objectAssign2 = require_objectAssign();
    var _curry22 = require_curry2();
    var mergeLeft3 = /* @__PURE__ */ _curry22(function mergeLeft4(l, r) {
      return _objectAssign2({}, r, l);
    });
    module.exports = mergeLeft3;
  }
});

// node_modules/ramda/src/mergeRight.js
var require_mergeRight = __commonJS({
  "node_modules/ramda/src/mergeRight.js"(exports, module) {
    var _objectAssign2 = require_objectAssign();
    var _curry22 = require_curry2();
    var mergeRight3 = /* @__PURE__ */ _curry22(function mergeRight4(l, r) {
      return _objectAssign2({}, l, r);
    });
    module.exports = mergeRight3;
  }
});

// node_modules/ramda/src/mergeWith.js
var require_mergeWith = __commonJS({
  "node_modules/ramda/src/mergeWith.js"(exports, module) {
    var _curry32 = require_curry3();
    var mergeWithKey3 = require_mergeWithKey();
    var mergeWith3 = /* @__PURE__ */ _curry32(function mergeWith4(fn, l, r) {
      return mergeWithKey3(function(_2, _l, _r) {
        return fn(_l, _r);
      }, l, r);
    });
    module.exports = mergeWith3;
  }
});

// node_modules/ramda/src/min.js
var require_min = __commonJS({
  "node_modules/ramda/src/min.js"(exports, module) {
    var _curry22 = require_curry2();
    var min3 = /* @__PURE__ */ _curry22(function min4(a, b) {
      return b < a ? b : a;
    });
    module.exports = min3;
  }
});

// node_modules/ramda/src/minBy.js
var require_minBy = __commonJS({
  "node_modules/ramda/src/minBy.js"(exports, module) {
    var _curry32 = require_curry3();
    var minBy3 = /* @__PURE__ */ _curry32(function minBy4(f, a, b) {
      return f(b) < f(a) ? b : a;
    });
    module.exports = minBy3;
  }
});

// node_modules/ramda/src/internal/_modify.js
var require_modify = __commonJS({
  "node_modules/ramda/src/internal/_modify.js"(exports, module) {
    var _isArray2 = require_isArray();
    var _isInteger2 = require_isInteger();
    function _modify2(prop4, fn, obj) {
      if (_isInteger2(prop4) && _isArray2(obj)) {
        var arr = [].concat(obj);
        arr[prop4] = fn(arr[prop4]);
        return arr;
      }
      var result = {};
      for (var p in obj) {
        result[p] = obj[p];
      }
      result[prop4] = fn(result[prop4]);
      return result;
    }
    module.exports = _modify2;
  }
});

// node_modules/ramda/src/modifyPath.js
var require_modifyPath = __commonJS({
  "node_modules/ramda/src/modifyPath.js"(exports, module) {
    var _curry32 = require_curry3();
    var _isArray2 = require_isArray();
    var _isObject2 = require_isObject();
    var _has2 = require_has();
    var _assoc2 = require_assoc();
    var _modify2 = require_modify();
    var modifyPath3 = /* @__PURE__ */ _curry32(function modifyPath4(path3, fn, object) {
      if (!_isObject2(object) && !_isArray2(object) || path3.length === 0) {
        return object;
      }
      var idx = path3[0];
      if (!_has2(idx, object)) {
        return object;
      }
      if (path3.length === 1) {
        return _modify2(idx, fn, object);
      }
      var val = modifyPath4(Array.prototype.slice.call(path3, 1), fn, object[idx]);
      if (val === object[idx]) {
        return object;
      }
      return _assoc2(idx, val, object);
    });
    module.exports = modifyPath3;
  }
});

// node_modules/ramda/src/modify.js
var require_modify2 = __commonJS({
  "node_modules/ramda/src/modify.js"(exports, module) {
    var _curry32 = require_curry3();
    var modifyPath3 = require_modifyPath();
    var modify3 = /* @__PURE__ */ _curry32(function modify4(prop4, fn, object) {
      return modifyPath3([prop4], fn, object);
    });
    module.exports = modify3;
  }
});

// node_modules/ramda/src/modulo.js
var require_modulo = __commonJS({
  "node_modules/ramda/src/modulo.js"(exports, module) {
    var _curry22 = require_curry2();
    var modulo3 = /* @__PURE__ */ _curry22(function modulo4(a, b) {
      return a % b;
    });
    module.exports = modulo3;
  }
});

// node_modules/ramda/src/move.js
var require_move = __commonJS({
  "node_modules/ramda/src/move.js"(exports, module) {
    var _curry32 = require_curry3();
    var move2 = /* @__PURE__ */ _curry32(function(from, to, list) {
      var length3 = list.length;
      var result = list.slice();
      var positiveFrom = from < 0 ? length3 + from : from;
      var positiveTo = to < 0 ? length3 + to : to;
      var item = result.splice(positiveFrom, 1);
      return positiveFrom < 0 || positiveFrom >= list.length || positiveTo < 0 || positiveTo >= list.length ? list : [].concat(result.slice(0, positiveTo)).concat(item).concat(result.slice(positiveTo, list.length));
    });
    module.exports = move2;
  }
});

// node_modules/ramda/src/multiply.js
var require_multiply = __commonJS({
  "node_modules/ramda/src/multiply.js"(exports, module) {
    var _curry22 = require_curry2();
    var multiply3 = /* @__PURE__ */ _curry22(function multiply4(a, b) {
      return a * b;
    });
    module.exports = multiply3;
  }
});

// node_modules/ramda/src/partialObject.js
var require_partialObject = __commonJS({
  "node_modules/ramda/src/partialObject.js"(exports, module) {
    var mergeDeepRight3 = require_mergeDeepRight();
    var _curry22 = require_curry2();
    module.exports = /* @__PURE__ */ _curry22((f, o3) => (props3) => f.call(exports, mergeDeepRight3(o3, props3)));
  }
});

// node_modules/ramda/src/negate.js
var require_negate = __commonJS({
  "node_modules/ramda/src/negate.js"(exports, module) {
    var _curry12 = require_curry1();
    var negate3 = /* @__PURE__ */ _curry12(function negate4(n2) {
      return -n2;
    });
    module.exports = negate3;
  }
});

// node_modules/ramda/src/none.js
var require_none = __commonJS({
  "node_modules/ramda/src/none.js"(exports, module) {
    var _complement2 = require_complement2();
    var _curry22 = require_curry2();
    var all3 = require_all();
    var none4 = /* @__PURE__ */ _curry22(function none5(fn, input) {
      return all3(_complement2(fn), input);
    });
    module.exports = none4;
  }
});

// node_modules/ramda/src/nthArg.js
var require_nthArg = __commonJS({
  "node_modules/ramda/src/nthArg.js"(exports, module) {
    var _curry12 = require_curry1();
    var curryN3 = require_curryN2();
    var nth3 = require_nth();
    var nthArg3 = /* @__PURE__ */ _curry12(function nthArg4(n2) {
      var arity = n2 < 0 ? 1 : n2 + 1;
      return curryN3(arity, function() {
        return nth3(n2, arguments);
      });
    });
    module.exports = nthArg3;
  }
});

// node_modules/ramda/src/o.js
var require_o = __commonJS({
  "node_modules/ramda/src/o.js"(exports, module) {
    var _curry32 = require_curry3();
    var o3 = /* @__PURE__ */ _curry32(function o4(f, g2, x) {
      return f(g2(x));
    });
    module.exports = o3;
  }
});

// node_modules/ramda/src/internal/_of.js
var require_of = __commonJS({
  "node_modules/ramda/src/internal/_of.js"(exports, module) {
    function _of2(x) {
      return [x];
    }
    module.exports = _of2;
  }
});

// node_modules/ramda/src/of.js
var require_of2 = __commonJS({
  "node_modules/ramda/src/of.js"(exports, module) {
    var _curry12 = require_curry1();
    var _of2 = require_of();
    var of3 = /* @__PURE__ */ _curry12(_of2);
    module.exports = of3;
  }
});

// node_modules/ramda/src/omit.js
var require_omit = __commonJS({
  "node_modules/ramda/src/omit.js"(exports, module) {
    var _curry22 = require_curry2();
    var omit3 = /* @__PURE__ */ _curry22(function omit4(names, obj) {
      var result = {};
      var index = {};
      var idx = 0;
      var len = names.length;
      while (idx < len) {
        index[names[idx]] = 1;
        idx += 1;
      }
      for (var prop4 in obj) {
        if (!index.hasOwnProperty(prop4)) {
          result[prop4] = obj[prop4];
        }
      }
      return result;
    });
    module.exports = omit3;
  }
});

// node_modules/ramda/src/on.js
var require_on = __commonJS({
  "node_modules/ramda/src/on.js"(exports, module) {
    var curryN3 = require_curryN();
    var on3 = /* @__PURE__ */ curryN3(4, [], function on4(f, g2, a, b) {
      return f(g2(a), g2(b));
    });
    module.exports = on3;
  }
});

// node_modules/ramda/src/once.js
var require_once = __commonJS({
  "node_modules/ramda/src/once.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry12 = require_curry1();
    var once3 = /* @__PURE__ */ _curry12(function once4(fn) {
      var called = false;
      var result;
      return _arity2(fn.length, function() {
        if (called) {
          return result;
        }
        called = true;
        result = fn.apply(this, arguments);
        return result;
      });
    });
    module.exports = once3;
  }
});

// node_modules/ramda/src/internal/_assertPromise.js
var require_assertPromise = __commonJS({
  "node_modules/ramda/src/internal/_assertPromise.js"(exports, module) {
    var _isFunction2 = require_isFunction();
    var _toString2 = require_toString();
    function _assertPromise2(name, p) {
      if (p == null || !_isFunction2(p.then)) {
        throw new TypeError("`" + name + "` expected a Promise, received " + _toString2(p, []));
      }
    }
    module.exports = _assertPromise2;
  }
});

// node_modules/ramda/src/otherwise.js
var require_otherwise = __commonJS({
  "node_modules/ramda/src/otherwise.js"(exports, module) {
    var _curry22 = require_curry2();
    var _assertPromise2 = require_assertPromise();
    var otherwise3 = /* @__PURE__ */ _curry22(function otherwise4(f, p) {
      _assertPromise2("otherwise", p);
      return p.then(null, f);
    });
    module.exports = otherwise3;
  }
});

// node_modules/ramda/src/over.js
var require_over = __commonJS({
  "node_modules/ramda/src/over.js"(exports, module) {
    var _curry32 = require_curry3();
    var Identity2 = function(x) {
      return {
        value: x,
        map: function(f) {
          return Identity2(f(x));
        }
      };
    };
    var over3 = /* @__PURE__ */ _curry32(function over4(lens3, f, x) {
      return lens3(function(y) {
        return Identity2(f(y));
      })(x).value;
    });
    module.exports = over3;
  }
});

// node_modules/ramda/src/pair.js
var require_pair = __commonJS({
  "node_modules/ramda/src/pair.js"(exports, module) {
    var _curry22 = require_curry2();
    var pair3 = /* @__PURE__ */ _curry22(function pair4(fst, snd) {
      return [fst, snd];
    });
    module.exports = pair3;
  }
});

// node_modules/ramda/src/internal/_createPartialApplicator.js
var require_createPartialApplicator = __commonJS({
  "node_modules/ramda/src/internal/_createPartialApplicator.js"(exports, module) {
    var _arity2 = require_arity();
    var _curry22 = require_curry2();
    function _createPartialApplicator2(concat4) {
      return _curry22(function(fn, args) {
        return _arity2(Math.max(0, fn.length - args.length), function() {
          return fn.apply(this, concat4(args, arguments));
        });
      });
    }
    module.exports = _createPartialApplicator2;
  }
});

// node_modules/ramda/src/partial.js
var require_partial = __commonJS({
  "node_modules/ramda/src/partial.js"(exports, module) {
    var _concat2 = require_concat();
    var _createPartialApplicator2 = require_createPartialApplicator();
    var partial2 = /* @__PURE__ */ _createPartialApplicator2(_concat2);
    module.exports = partial2;
  }
});

// node_modules/ramda/src/partialRight.js
var require_partialRight = __commonJS({
  "node_modules/ramda/src/partialRight.js"(exports, module) {
    var _concat2 = require_concat();
    var _createPartialApplicator2 = require_createPartialApplicator();
    var flip3 = require_flip();
    var partialRight2 = /* @__PURE__ */ _createPartialApplicator2(
      /* @__PURE__ */ flip3(_concat2)
    );
    module.exports = partialRight2;
  }
});

// node_modules/ramda/src/partition.js
var require_partition = __commonJS({
  "node_modules/ramda/src/partition.js"(exports, module) {
    var filter3 = require_filter2();
    var juxt3 = require_juxt();
    var reject3 = require_reject();
    var partition2 = /* @__PURE__ */ juxt3([filter3, reject3]);
    module.exports = partition2;
  }
});

// node_modules/ramda/src/pathEq.js
var require_pathEq = __commonJS({
  "node_modules/ramda/src/pathEq.js"(exports, module) {
    var _curry32 = require_curry3();
    var equals4 = require_equals2();
    var path3 = require_path();
    var pathEq3 = /* @__PURE__ */ _curry32(function pathEq4(_path, val, obj) {
      return equals4(path3(_path, obj), val);
    });
    module.exports = pathEq3;
  }
});

// node_modules/ramda/src/pathOr.js
var require_pathOr = __commonJS({
  "node_modules/ramda/src/pathOr.js"(exports, module) {
    var _curry32 = require_curry3();
    var defaultTo3 = require_defaultTo();
    var path3 = require_path();
    var pathOr3 = /* @__PURE__ */ _curry32(function pathOr4(d, p, obj) {
      return defaultTo3(d, path3(p, obj));
    });
    module.exports = pathOr3;
  }
});

// node_modules/ramda/src/pathSatisfies.js
var require_pathSatisfies = __commonJS({
  "node_modules/ramda/src/pathSatisfies.js"(exports, module) {
    var _curry32 = require_curry3();
    var path3 = require_path();
    var pathSatisfies3 = /* @__PURE__ */ _curry32(function pathSatisfies4(pred, propPath, obj) {
      return pred(path3(propPath, obj));
    });
    module.exports = pathSatisfies3;
  }
});

// node_modules/ramda/src/pick.js
var require_pick = __commonJS({
  "node_modules/ramda/src/pick.js"(exports, module) {
    var _curry22 = require_curry2();
    var pick4 = /* @__PURE__ */ _curry22(function pick5(names, obj) {
      var result = {};
      var idx = 0;
      while (idx < names.length) {
        if (names[idx] in obj) {
          result[names[idx]] = obj[names[idx]];
        }
        idx += 1;
      }
      return result;
    });
    module.exports = pick4;
  }
});

// node_modules/ramda/src/pickAll.js
var require_pickAll = __commonJS({
  "node_modules/ramda/src/pickAll.js"(exports, module) {
    var _curry22 = require_curry2();
    var pickAll3 = /* @__PURE__ */ _curry22(function pickAll4(names, obj) {
      var result = {};
      var idx = 0;
      var len = names.length;
      while (idx < len) {
        var name = names[idx];
        result[name] = obj[name];
        idx += 1;
      }
      return result;
    });
    module.exports = pickAll3;
  }
});

// node_modules/ramda/src/pickBy.js
var require_pickBy = __commonJS({
  "node_modules/ramda/src/pickBy.js"(exports, module) {
    var _curry22 = require_curry2();
    var pickBy3 = /* @__PURE__ */ _curry22(function pickBy4(test3, obj) {
      var result = {};
      for (var prop4 in obj) {
        if (test3(obj[prop4], prop4, obj)) {
          result[prop4] = obj[prop4];
        }
      }
      return result;
    });
    module.exports = pickBy3;
  }
});

// node_modules/ramda/src/prepend.js
var require_prepend = __commonJS({
  "node_modules/ramda/src/prepend.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry22 = require_curry2();
    var prepend3 = /* @__PURE__ */ _curry22(function prepend4(el, list) {
      return _concat2([el], list);
    });
    module.exports = prepend3;
  }
});

// node_modules/ramda/src/product.js
var require_product = __commonJS({
  "node_modules/ramda/src/product.js"(exports, module) {
    var multiply3 = require_multiply();
    var reduce2 = require_reduce2();
    var product2 = /* @__PURE__ */ reduce2(multiply3, 1);
    module.exports = product2;
  }
});

// node_modules/ramda/src/useWith.js
var require_useWith = __commonJS({
  "node_modules/ramda/src/useWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var curryN3 = require_curryN2();
    var useWith3 = /* @__PURE__ */ _curry22(function useWith4(fn, transformers) {
      return curryN3(transformers.length, function() {
        var args = [];
        var idx = 0;
        while (idx < transformers.length) {
          args.push(transformers[idx].call(this, arguments[idx]));
          idx += 1;
        }
        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, transformers.length)));
      });
    });
    module.exports = useWith3;
  }
});

// node_modules/ramda/src/project.js
var require_project = __commonJS({
  "node_modules/ramda/src/project.js"(exports, module) {
    var _map2 = require_map();
    var identity2 = require_identity2();
    var pickAll3 = require_pickAll();
    var useWith3 = require_useWith();
    var project2 = /* @__PURE__ */ useWith3(_map2, [pickAll3, identity2]);
    module.exports = project2;
  }
});

// node_modules/ramda/src/internal/_promap.js
var require_promap = __commonJS({
  "node_modules/ramda/src/internal/_promap.js"(exports, module) {
    function _promap2(f, g2, profunctor) {
      return function(x) {
        return g2(profunctor(f(x)));
      };
    }
    module.exports = _promap2;
  }
});

// node_modules/ramda/src/internal/_xpromap.js
var require_xpromap = __commonJS({
  "node_modules/ramda/src/internal/_xpromap.js"(exports, module) {
    var _curry32 = require_curry3();
    var _xfBase = require_xfBase();
    var _promap2 = require_promap();
    var XPromap2 = /* @__PURE__ */ function() {
      function XPromap3(f, g2, xf) {
        this.xf = xf;
        this.f = f;
        this.g = g2;
      }
      XPromap3.prototype["@@transducer/init"] = _xfBase.init;
      XPromap3.prototype["@@transducer/result"] = _xfBase.result;
      XPromap3.prototype["@@transducer/step"] = function(result, input) {
        return this.xf["@@transducer/step"](result, _promap2(this.f, this.g, input));
      };
      return XPromap3;
    }();
    var _xpromap3 = /* @__PURE__ */ _curry32(function _xpromap4(f, g2, xf) {
      return new XPromap2(f, g2, xf);
    });
    module.exports = _xpromap3;
  }
});

// node_modules/ramda/src/promap.js
var require_promap2 = __commonJS({
  "node_modules/ramda/src/promap.js"(exports, module) {
    var _curry32 = require_curry3();
    var _dispatchable2 = require_dispatchable();
    var _promap2 = require_promap();
    var _xpromap3 = require_xpromap();
    var promap2 = /* @__PURE__ */ _curry32(
      /* @__PURE__ */ _dispatchable2(["fantasy-land/promap", "promap"], _xpromap3, _promap2)
    );
    module.exports = promap2;
  }
});

// node_modules/ramda/src/propEq.js
var require_propEq = __commonJS({
  "node_modules/ramda/src/propEq.js"(exports, module) {
    var _curry32 = require_curry3();
    var prop4 = require_prop();
    var equals4 = require_equals2();
    var propEq3 = /* @__PURE__ */ _curry32(function propEq4(name, val, obj) {
      return equals4(val, prop4(name, obj));
    });
    module.exports = propEq3;
  }
});

// node_modules/ramda/src/propIs.js
var require_propIs = __commonJS({
  "node_modules/ramda/src/propIs.js"(exports, module) {
    var _curry32 = require_curry3();
    var prop4 = require_prop();
    var is4 = require_is();
    var propIs3 = /* @__PURE__ */ _curry32(function propIs4(type3, name, obj) {
      return is4(type3, prop4(name, obj));
    });
    module.exports = propIs3;
  }
});

// node_modules/ramda/src/propOr.js
var require_propOr = __commonJS({
  "node_modules/ramda/src/propOr.js"(exports, module) {
    var _curry32 = require_curry3();
    var defaultTo3 = require_defaultTo();
    var prop4 = require_prop();
    var propOr3 = /* @__PURE__ */ _curry32(function propOr4(val, p, obj) {
      return defaultTo3(val, prop4(p, obj));
    });
    module.exports = propOr3;
  }
});

// node_modules/ramda/src/propSatisfies.js
var require_propSatisfies = __commonJS({
  "node_modules/ramda/src/propSatisfies.js"(exports, module) {
    var _curry32 = require_curry3();
    var prop4 = require_prop();
    var propSatisfies3 = /* @__PURE__ */ _curry32(function propSatisfies4(pred, name, obj) {
      return pred(prop4(name, obj));
    });
    module.exports = propSatisfies3;
  }
});

// node_modules/ramda/src/props.js
var require_props = __commonJS({
  "node_modules/ramda/src/props.js"(exports, module) {
    var _curry22 = require_curry2();
    var path3 = require_path();
    var props3 = /* @__PURE__ */ _curry22(function props4(ps, obj) {
      return ps.map(function(p) {
        return path3([p], obj);
      });
    });
    module.exports = props3;
  }
});

// node_modules/ramda/src/range.js
var require_range = __commonJS({
  "node_modules/ramda/src/range.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isNumber2 = require_isNumber();
    var range4 = /* @__PURE__ */ _curry22(function range5(from, to) {
      if (!(_isNumber2(from) && _isNumber2(to))) {
        throw new TypeError("Both arguments to range must be numbers");
      }
      var result = [];
      var n2 = from;
      while (n2 < to) {
        result.push(n2);
        n2 += 1;
      }
      return result;
    });
    module.exports = range4;
  }
});

// node_modules/ramda/src/reduceRight.js
var require_reduceRight = __commonJS({
  "node_modules/ramda/src/reduceRight.js"(exports, module) {
    var _curry32 = require_curry3();
    var reduceRight3 = /* @__PURE__ */ _curry32(function reduceRight4(fn, acc, list) {
      var idx = list.length - 1;
      while (idx >= 0) {
        acc = fn(list[idx], acc);
        if (acc && acc["@@transducer/reduced"]) {
          acc = acc["@@transducer/value"];
          break;
        }
        idx -= 1;
      }
      return acc;
    });
    module.exports = reduceRight3;
  }
});

// node_modules/ramda/src/reduceWhile.js
var require_reduceWhile = __commonJS({
  "node_modules/ramda/src/reduceWhile.js"(exports, module) {
    var _curryN2 = require_curryN();
    var _reduce2 = require_reduce();
    var _reduced2 = require_reduced();
    var reduceWhile2 = /* @__PURE__ */ _curryN2(4, [], function _reduceWhile2(pred, fn, a, list) {
      return _reduce2(function(acc, x) {
        return pred(acc, x) ? fn(acc, x) : _reduced2(acc);
      }, a, list);
    });
    module.exports = reduceWhile2;
  }
});

// node_modules/ramda/src/reduced.js
var require_reduced2 = __commonJS({
  "node_modules/ramda/src/reduced.js"(exports, module) {
    var _curry12 = require_curry1();
    var _reduced2 = require_reduced();
    var reduced2 = /* @__PURE__ */ _curry12(_reduced2);
    module.exports = reduced2;
  }
});

// node_modules/ramda/src/times.js
var require_times = __commonJS({
  "node_modules/ramda/src/times.js"(exports, module) {
    var _curry22 = require_curry2();
    var times3 = /* @__PURE__ */ _curry22(function times4(fn, n2) {
      var len = Number(n2);
      var idx = 0;
      var list;
      if (len < 0 || isNaN(len)) {
        throw new RangeError("n must be a non-negative number");
      }
      list = new Array(len);
      while (idx < len) {
        list[idx] = fn(idx);
        idx += 1;
      }
      return list;
    });
    module.exports = times3;
  }
});

// node_modules/ramda/src/repeat.js
var require_repeat = __commonJS({
  "node_modules/ramda/src/repeat.js"(exports, module) {
    var _curry22 = require_curry2();
    var always3 = require_always();
    var times3 = require_times();
    var repeat3 = /* @__PURE__ */ _curry22(function repeat4(value, n2) {
      return times3(always3(value), n2);
    });
    module.exports = repeat3;
  }
});

// node_modules/ramda/src/replace.js
var require_replace = __commonJS({
  "node_modules/ramda/src/replace.js"(exports, module) {
    var _curry32 = require_curry3();
    var replace3 = /* @__PURE__ */ _curry32(function replace4(regex, replacement, str) {
      return str.replace(regex, replacement);
    });
    module.exports = replace3;
  }
});

// node_modules/ramda/src/scan.js
var require_scan2 = __commonJS({
  "node_modules/ramda/src/scan.js"(exports, module) {
    var _curry32 = require_curry3();
    var scan3 = /* @__PURE__ */ _curry32(function scan4(fn, acc, list) {
      var idx = 0;
      var len = list.length;
      var result = [acc];
      while (idx < len) {
        acc = fn(acc, list[idx]);
        result[idx + 1] = acc;
        idx += 1;
      }
      return result;
    });
    module.exports = scan3;
  }
});

// node_modules/ramda/src/sequence.js
var require_sequence = __commonJS({
  "node_modules/ramda/src/sequence.js"(exports, module) {
    var _curry22 = require_curry2();
    var ap3 = require_ap();
    var map4 = require_map2();
    var prepend3 = require_prepend();
    var reduceRight3 = require_reduceRight();
    var sequence3 = /* @__PURE__ */ _curry22(function sequence4(of3, traversable) {
      return typeof traversable.sequence === "function" ? traversable.sequence(of3) : reduceRight3(function(x, acc) {
        return ap3(map4(prepend3, x), acc);
      }, of3([]), traversable);
    });
    module.exports = sequence3;
  }
});

// node_modules/ramda/src/set.js
var require_set = __commonJS({
  "node_modules/ramda/src/set.js"(exports, module) {
    var _curry32 = require_curry3();
    var always3 = require_always();
    var over3 = require_over();
    var set4 = /* @__PURE__ */ _curry32(function set5(lens3, v, x) {
      return over3(lens3, always3(v), x);
    });
    module.exports = set4;
  }
});

// node_modules/ramda/src/sort.js
var require_sort = __commonJS({
  "node_modules/ramda/src/sort.js"(exports, module) {
    var _curry22 = require_curry2();
    var sort3 = /* @__PURE__ */ _curry22(function sort4(comparator3, list) {
      return Array.prototype.slice.call(list, 0).sort(comparator3);
    });
    module.exports = sort3;
  }
});

// node_modules/ramda/src/sortBy.js
var require_sortBy = __commonJS({
  "node_modules/ramda/src/sortBy.js"(exports, module) {
    var _curry22 = require_curry2();
    var sortBy3 = /* @__PURE__ */ _curry22(function sortBy4(fn, list) {
      return Array.prototype.slice.call(list, 0).sort(function(a, b) {
        var aa = fn(a);
        var bb = fn(b);
        return aa < bb ? -1 : aa > bb ? 1 : 0;
      });
    });
    module.exports = sortBy3;
  }
});

// node_modules/ramda/src/sortWith.js
var require_sortWith = __commonJS({
  "node_modules/ramda/src/sortWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var sortWith3 = /* @__PURE__ */ _curry22(function sortWith4(fns, list) {
      return Array.prototype.slice.call(list, 0).sort(function(a, b) {
        var result = 0;
        var i = 0;
        while (result === 0 && i < fns.length) {
          result = fns[i](a, b);
          i += 1;
        }
        return result;
      });
    });
    module.exports = sortWith3;
  }
});

// node_modules/ramda/src/split.js
var require_split = __commonJS({
  "node_modules/ramda/src/split.js"(exports, module) {
    var invoker3 = require_invoker();
    var split2 = /* @__PURE__ */ invoker3(1, "split");
    module.exports = split2;
  }
});

// node_modules/ramda/src/splitAt.js
var require_splitAt = __commonJS({
  "node_modules/ramda/src/splitAt.js"(exports, module) {
    var _curry22 = require_curry2();
    var length3 = require_length();
    var slice4 = require_slice();
    var splitAt3 = /* @__PURE__ */ _curry22(function splitAt4(index, array) {
      return [slice4(0, index, array), slice4(index, length3(array), array)];
    });
    module.exports = splitAt3;
  }
});

// node_modules/ramda/src/splitEvery.js
var require_splitEvery = __commonJS({
  "node_modules/ramda/src/splitEvery.js"(exports, module) {
    var _curry22 = require_curry2();
    var slice4 = require_slice();
    var splitEvery3 = /* @__PURE__ */ _curry22(function splitEvery4(n2, list) {
      if (n2 <= 0) {
        throw new Error("First argument to splitEvery must be a positive integer");
      }
      var result = [];
      var idx = 0;
      while (idx < list.length) {
        result.push(slice4(idx, idx += n2, list));
      }
      return result;
    });
    module.exports = splitEvery3;
  }
});

// node_modules/ramda/src/splitWhen.js
var require_splitWhen = __commonJS({
  "node_modules/ramda/src/splitWhen.js"(exports, module) {
    var _curry22 = require_curry2();
    var splitWhen3 = /* @__PURE__ */ _curry22(function splitWhen4(pred, list) {
      var idx = 0;
      var len = list.length;
      var prefix = [];
      while (idx < len && !pred(list[idx])) {
        prefix.push(list[idx]);
        idx += 1;
      }
      return [prefix, Array.prototype.slice.call(list, idx)];
    });
    module.exports = splitWhen3;
  }
});

// node_modules/ramda/src/splitWhenever.js
var require_splitWhenever = __commonJS({
  "node_modules/ramda/src/splitWhenever.js"(exports, module) {
    var _curryN2 = require_curryN();
    var splitWhenever3 = /* @__PURE__ */ _curryN2(2, [], function splitWhenever4(pred, list) {
      var acc = [];
      var curr = [];
      for (var i = 0; i < list.length; i = i + 1) {
        if (!pred(list[i])) {
          curr.push(list[i]);
        }
        if ((i < list.length - 1 && pred(list[i + 1]) || i === list.length - 1) && curr.length > 0) {
          acc.push(curr);
          curr = [];
        }
      }
      return acc;
    });
    module.exports = splitWhenever3;
  }
});

// node_modules/ramda/src/startsWith.js
var require_startsWith = __commonJS({
  "node_modules/ramda/src/startsWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var equals4 = require_equals2();
    var take3 = require_take();
    var startsWith2 = /* @__PURE__ */ _curry22(function(prefix, list) {
      return equals4(take3(prefix.length, list), prefix);
    });
    module.exports = startsWith2;
  }
});

// node_modules/ramda/src/subtract.js
var require_subtract = __commonJS({
  "node_modules/ramda/src/subtract.js"(exports, module) {
    var _curry22 = require_curry2();
    var subtract3 = /* @__PURE__ */ _curry22(function subtract4(a, b) {
      return Number(a) - Number(b);
    });
    module.exports = subtract3;
  }
});

// node_modules/ramda/src/symmetricDifference.js
var require_symmetricDifference = __commonJS({
  "node_modules/ramda/src/symmetricDifference.js"(exports, module) {
    var _curry22 = require_curry2();
    var concat4 = require_concat2();
    var difference4 = require_difference();
    var symmetricDifference3 = /* @__PURE__ */ _curry22(function symmetricDifference4(list1, list2) {
      return concat4(difference4(list1, list2), difference4(list2, list1));
    });
    module.exports = symmetricDifference3;
  }
});

// node_modules/ramda/src/symmetricDifferenceWith.js
var require_symmetricDifferenceWith = __commonJS({
  "node_modules/ramda/src/symmetricDifferenceWith.js"(exports, module) {
    var _curry32 = require_curry3();
    var concat4 = require_concat2();
    var differenceWith3 = require_differenceWith();
    var symmetricDifferenceWith3 = /* @__PURE__ */ _curry32(function symmetricDifferenceWith4(pred, list1, list2) {
      return concat4(differenceWith3(pred, list1, list2), differenceWith3(pred, list2, list1));
    });
    module.exports = symmetricDifferenceWith3;
  }
});

// node_modules/ramda/src/takeLastWhile.js
var require_takeLastWhile = __commonJS({
  "node_modules/ramda/src/takeLastWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var slice4 = require_slice();
    var takeLastWhile3 = /* @__PURE__ */ _curry22(function takeLastWhile4(fn, xs) {
      var idx = xs.length - 1;
      while (idx >= 0 && fn(xs[idx])) {
        idx -= 1;
      }
      return slice4(idx + 1, Infinity, xs);
    });
    module.exports = takeLastWhile3;
  }
});

// node_modules/ramda/src/internal/_xtakeWhile.js
var require_xtakeWhile = __commonJS({
  "node_modules/ramda/src/internal/_xtakeWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var _reduced2 = require_reduced();
    var _xfBase = require_xfBase();
    var XTakeWhile2 = /* @__PURE__ */ function() {
      function XTakeWhile3(f, xf) {
        this.xf = xf;
        this.f = f;
      }
      XTakeWhile3.prototype["@@transducer/init"] = _xfBase.init;
      XTakeWhile3.prototype["@@transducer/result"] = _xfBase.result;
      XTakeWhile3.prototype["@@transducer/step"] = function(result, input) {
        return this.f(input) ? this.xf["@@transducer/step"](result, input) : _reduced2(result);
      };
      return XTakeWhile3;
    }();
    var _xtakeWhile3 = /* @__PURE__ */ _curry22(function _xtakeWhile4(f, xf) {
      return new XTakeWhile2(f, xf);
    });
    module.exports = _xtakeWhile3;
  }
});

// node_modules/ramda/src/takeWhile.js
var require_takeWhile = __commonJS({
  "node_modules/ramda/src/takeWhile.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xtakeWhile3 = require_xtakeWhile();
    var slice4 = require_slice();
    var takeWhile3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2(["takeWhile"], _xtakeWhile3, function takeWhile4(fn, xs) {
        var idx = 0;
        var len = xs.length;
        while (idx < len && fn(xs[idx])) {
          idx += 1;
        }
        return slice4(0, idx, xs);
      })
    );
    module.exports = takeWhile3;
  }
});

// node_modules/ramda/src/internal/_xtap.js
var require_xtap = __commonJS({
  "node_modules/ramda/src/internal/_xtap.js"(exports, module) {
    var _curry22 = require_curry2();
    var _xfBase = require_xfBase();
    var XTap2 = /* @__PURE__ */ function() {
      function XTap3(f, xf) {
        this.xf = xf;
        this.f = f;
      }
      XTap3.prototype["@@transducer/init"] = _xfBase.init;
      XTap3.prototype["@@transducer/result"] = _xfBase.result;
      XTap3.prototype["@@transducer/step"] = function(result, input) {
        this.f(input);
        return this.xf["@@transducer/step"](result, input);
      };
      return XTap3;
    }();
    var _xtap3 = /* @__PURE__ */ _curry22(function _xtap4(f, xf) {
      return new XTap2(f, xf);
    });
    module.exports = _xtap3;
  }
});

// node_modules/ramda/src/tap.js
var require_tap = __commonJS({
  "node_modules/ramda/src/tap.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _xtap3 = require_xtap();
    var tap3 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xtap3, function tap4(fn, x) {
        fn(x);
        return x;
      })
    );
    module.exports = tap3;
  }
});

// node_modules/ramda/src/internal/_isRegExp.js
var require_isRegExp = __commonJS({
  "node_modules/ramda/src/internal/_isRegExp.js"(exports, module) {
    function _isRegExp2(x) {
      return Object.prototype.toString.call(x) === "[object RegExp]";
    }
    module.exports = _isRegExp2;
  }
});

// node_modules/ramda/src/test.js
var require_test = __commonJS({
  "node_modules/ramda/src/test.js"(exports, module) {
    var _cloneRegExp2 = require_cloneRegExp();
    var _curry22 = require_curry2();
    var _isRegExp2 = require_isRegExp();
    var toString4 = require_toString2();
    var test3 = /* @__PURE__ */ _curry22(function test4(pattern, str) {
      if (!_isRegExp2(pattern)) {
        throw new TypeError("\u2018test\u2019 requires a value of type RegExp as its first argument; received " + toString4(pattern));
      }
      return _cloneRegExp2(pattern).test(str);
    });
    module.exports = test3;
  }
});

// node_modules/ramda/src/andThen.js
var require_andThen = __commonJS({
  "node_modules/ramda/src/andThen.js"(exports, module) {
    var _curry22 = require_curry2();
    var _assertPromise2 = require_assertPromise();
    var andThen3 = /* @__PURE__ */ _curry22(function andThen4(f, p) {
      _assertPromise2("andThen", p);
      return p.then(f);
    });
    module.exports = andThen3;
  }
});

// node_modules/ramda/src/toLower.js
var require_toLower = __commonJS({
  "node_modules/ramda/src/toLower.js"(exports, module) {
    var invoker3 = require_invoker();
    var toLower2 = /* @__PURE__ */ invoker3(0, "toLowerCase");
    module.exports = toLower2;
  }
});

// node_modules/ramda/src/toPairs.js
var require_toPairs = __commonJS({
  "node_modules/ramda/src/toPairs.js"(exports, module) {
    var _curry12 = require_curry1();
    var _has2 = require_has();
    var toPairs3 = /* @__PURE__ */ _curry12(function toPairs4(obj) {
      var pairs = [];
      for (var prop4 in obj) {
        if (_has2(prop4, obj)) {
          pairs[pairs.length] = [prop4, obj[prop4]];
        }
      }
      return pairs;
    });
    module.exports = toPairs3;
  }
});

// node_modules/ramda/src/toPairsIn.js
var require_toPairsIn = __commonJS({
  "node_modules/ramda/src/toPairsIn.js"(exports, module) {
    var _curry12 = require_curry1();
    var toPairsIn3 = /* @__PURE__ */ _curry12(function toPairsIn4(obj) {
      var pairs = [];
      for (var prop4 in obj) {
        pairs[pairs.length] = [prop4, obj[prop4]];
      }
      return pairs;
    });
    module.exports = toPairsIn3;
  }
});

// node_modules/ramda/src/toUpper.js
var require_toUpper = __commonJS({
  "node_modules/ramda/src/toUpper.js"(exports, module) {
    var invoker3 = require_invoker();
    var toUpper2 = /* @__PURE__ */ invoker3(0, "toUpperCase");
    module.exports = toUpper2;
  }
});

// node_modules/ramda/src/transduce.js
var require_transduce = __commonJS({
  "node_modules/ramda/src/transduce.js"(exports, module) {
    var _reduce2 = require_reduce();
    var _xwrap2 = require_xwrap();
    var curryN3 = require_curryN2();
    var transduce3 = /* @__PURE__ */ curryN3(4, function transduce4(xf, fn, acc, list) {
      return _reduce2(xf(typeof fn === "function" ? _xwrap2(fn) : fn), acc, list);
    });
    module.exports = transduce3;
  }
});

// node_modules/ramda/src/transpose.js
var require_transpose = __commonJS({
  "node_modules/ramda/src/transpose.js"(exports, module) {
    var _curry12 = require_curry1();
    var transpose3 = /* @__PURE__ */ _curry12(function transpose4(outerlist) {
      var i = 0;
      var result = [];
      while (i < outerlist.length) {
        var innerlist = outerlist[i];
        var j = 0;
        while (j < innerlist.length) {
          if (typeof result[j] === "undefined") {
            result[j] = [];
          }
          result[j].push(innerlist[j]);
          j += 1;
        }
        i += 1;
      }
      return result;
    });
    module.exports = transpose3;
  }
});

// node_modules/ramda/src/traverse.js
var require_traverse = __commonJS({
  "node_modules/ramda/src/traverse.js"(exports, module) {
    var _curry32 = require_curry3();
    var map4 = require_map2();
    var sequence3 = require_sequence();
    var traverse3 = /* @__PURE__ */ _curry32(function traverse4(of3, f, traversable) {
      return typeof traversable["fantasy-land/traverse"] === "function" ? traversable["fantasy-land/traverse"](f, of3) : typeof traversable.traverse === "function" ? traversable.traverse(f, of3) : sequence3(of3, map4(f, traversable));
    });
    module.exports = traverse3;
  }
});

// node_modules/ramda/src/trim.js
var require_trim = __commonJS({
  "node_modules/ramda/src/trim.js"(exports, module) {
    var _curry12 = require_curry1();
    var ws2 = "	\n\v\f\r \xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF";
    var zeroWidth2 = "\u200B";
    var hasProtoTrim2 = typeof String.prototype.trim === "function";
    var trim4 = !hasProtoTrim2 || /* @__PURE__ */ ws2.trim() || !/* @__PURE__ */ zeroWidth2.trim() ? /* @__PURE__ */ _curry12(function trim5(str) {
      var beginRx = new RegExp("^[" + ws2 + "][" + ws2 + "]*");
      var endRx = new RegExp("[" + ws2 + "][" + ws2 + "]*$");
      return str.replace(beginRx, "").replace(endRx, "");
    }) : /* @__PURE__ */ _curry12(function trim5(str) {
      return str.trim();
    });
    module.exports = trim4;
  }
});

// node_modules/ramda/src/tryCatch.js
var require_tryCatch = __commonJS({
  "node_modules/ramda/src/tryCatch.js"(exports, module) {
    var _arity2 = require_arity();
    var _concat2 = require_concat();
    var _curry22 = require_curry2();
    var tryCatch2 = /* @__PURE__ */ _curry22(function _tryCatch2(tryer, catcher) {
      return _arity2(tryer.length, function() {
        try {
          return tryer.apply(this, arguments);
        } catch (e) {
          return catcher.apply(this, _concat2([e], arguments));
        }
      });
    });
    module.exports = tryCatch2;
  }
});

// node_modules/ramda/src/unapply.js
var require_unapply = __commonJS({
  "node_modules/ramda/src/unapply.js"(exports, module) {
    var _curry12 = require_curry1();
    var unapply3 = /* @__PURE__ */ _curry12(function unapply4(fn) {
      return function() {
        return fn(Array.prototype.slice.call(arguments, 0));
      };
    });
    module.exports = unapply3;
  }
});

// node_modules/ramda/src/unary.js
var require_unary = __commonJS({
  "node_modules/ramda/src/unary.js"(exports, module) {
    var _curry12 = require_curry1();
    var nAry3 = require_nAry();
    var unary3 = /* @__PURE__ */ _curry12(function unary4(fn) {
      return nAry3(1, fn);
    });
    module.exports = unary3;
  }
});

// node_modules/ramda/src/uncurryN.js
var require_uncurryN = __commonJS({
  "node_modules/ramda/src/uncurryN.js"(exports, module) {
    var _curry22 = require_curry2();
    var curryN3 = require_curryN2();
    var uncurryN3 = /* @__PURE__ */ _curry22(function uncurryN4(depth, fn) {
      return curryN3(depth, function() {
        var currentDepth = 1;
        var value = fn;
        var idx = 0;
        var endIdx;
        while (currentDepth <= depth && typeof value === "function") {
          endIdx = currentDepth === depth ? arguments.length : idx + value.length;
          value = value.apply(this, Array.prototype.slice.call(arguments, idx, endIdx));
          currentDepth += 1;
          idx = endIdx;
        }
        return value;
      });
    });
    module.exports = uncurryN3;
  }
});

// node_modules/ramda/src/unfold.js
var require_unfold = __commonJS({
  "node_modules/ramda/src/unfold.js"(exports, module) {
    var _curry22 = require_curry2();
    var unfold3 = /* @__PURE__ */ _curry22(function unfold4(fn, seed) {
      var pair3 = fn(seed);
      var result = [];
      while (pair3 && pair3.length) {
        result[result.length] = pair3[0];
        pair3 = fn(pair3[1]);
      }
      return result;
    });
    module.exports = unfold3;
  }
});

// node_modules/ramda/src/union.js
var require_union = __commonJS({
  "node_modules/ramda/src/union.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry22 = require_curry2();
    var compose3 = require_compose();
    var uniq3 = require_uniq();
    var union2 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ compose3(uniq3, _concat2)
    );
    module.exports = union2;
  }
});

// node_modules/ramda/src/internal/_xuniqWith.js
var require_xuniqWith = __commonJS({
  "node_modules/ramda/src/internal/_xuniqWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var _includesWith2 = require_includesWith();
    var _xfBase = require_xfBase();
    var XUniqWith2 = /* @__PURE__ */ function() {
      function XUniqWith3(pred, xf) {
        this.xf = xf;
        this.pred = pred;
        this.items = [];
      }
      XUniqWith3.prototype["@@transducer/init"] = _xfBase.init;
      XUniqWith3.prototype["@@transducer/result"] = _xfBase.result;
      XUniqWith3.prototype["@@transducer/step"] = function(result, input) {
        if (_includesWith2(this.pred, input, this.items)) {
          return result;
        } else {
          this.items.push(input);
          return this.xf["@@transducer/step"](result, input);
        }
      };
      return XUniqWith3;
    }();
    var _xuniqWith3 = /* @__PURE__ */ _curry22(function _xuniqWith4(pred, xf) {
      return new XUniqWith2(pred, xf);
    });
    module.exports = _xuniqWith3;
  }
});

// node_modules/ramda/src/uniqWith.js
var require_uniqWith = __commonJS({
  "node_modules/ramda/src/uniqWith.js"(exports, module) {
    var _curry22 = require_curry2();
    var _dispatchable2 = require_dispatchable();
    var _includesWith2 = require_includesWith();
    var _xuniqWith3 = require_xuniqWith();
    var uniqWith2 = /* @__PURE__ */ _curry22(
      /* @__PURE__ */ _dispatchable2([], _xuniqWith3, function(pred, list) {
        var idx = 0;
        var len = list.length;
        var result = [];
        var item;
        while (idx < len) {
          item = list[idx];
          if (!_includesWith2(pred, item, result)) {
            result[result.length] = item;
          }
          idx += 1;
        }
        return result;
      })
    );
    module.exports = uniqWith2;
  }
});

// node_modules/ramda/src/unionWith.js
var require_unionWith = __commonJS({
  "node_modules/ramda/src/unionWith.js"(exports, module) {
    var _concat2 = require_concat();
    var _curry32 = require_curry3();
    var uniqWith2 = require_uniqWith();
    var unionWith3 = /* @__PURE__ */ _curry32(function unionWith4(pred, list1, list2) {
      return uniqWith2(pred, _concat2(list1, list2));
    });
    module.exports = unionWith3;
  }
});

// node_modules/ramda/src/unless.js
var require_unless = __commonJS({
  "node_modules/ramda/src/unless.js"(exports, module) {
    var _curry32 = require_curry3();
    var unless3 = /* @__PURE__ */ _curry32(function unless4(pred, whenFalseFn, x) {
      return pred(x) ? x : whenFalseFn(x);
    });
    module.exports = unless3;
  }
});

// node_modules/ramda/src/unnest.js
var require_unnest = __commonJS({
  "node_modules/ramda/src/unnest.js"(exports, module) {
    var _identity2 = require_identity();
    var chain3 = require_chain();
    var unnest2 = /* @__PURE__ */ chain3(_identity2);
    module.exports = unnest2;
  }
});

// node_modules/ramda/src/until.js
var require_until = __commonJS({
  "node_modules/ramda/src/until.js"(exports, module) {
    var _curry32 = require_curry3();
    var until3 = /* @__PURE__ */ _curry32(function until4(pred, fn, init2) {
      var val = init2;
      while (!pred(val)) {
        val = fn(val);
      }
      return val;
    });
    module.exports = until3;
  }
});

// node_modules/ramda/src/unwind.js
var require_unwind = __commonJS({
  "node_modules/ramda/src/unwind.js"(exports, module) {
    var _curry22 = require_curry2();
    var _isArray2 = require_isArray();
    var _map2 = require_map();
    var _assoc2 = require_assoc();
    var unwind2 = /* @__PURE__ */ _curry22(function(key, object) {
      if (!(key in object && _isArray2(object[key]))) {
        return [object];
      }
      return _map2(function(item) {
        return _assoc2(key, item, object);
      }, object[key]);
    });
    module.exports = unwind2;
  }
});

// node_modules/ramda/src/valuesIn.js
var require_valuesIn = __commonJS({
  "node_modules/ramda/src/valuesIn.js"(exports, module) {
    var _curry12 = require_curry1();
    var valuesIn3 = /* @__PURE__ */ _curry12(function valuesIn4(obj) {
      var prop4;
      var vs = [];
      for (prop4 in obj) {
        vs[vs.length] = obj[prop4];
      }
      return vs;
    });
    module.exports = valuesIn3;
  }
});

// node_modules/ramda/src/view.js
var require_view = __commonJS({
  "node_modules/ramda/src/view.js"(exports, module) {
    var _curry22 = require_curry2();
    var Const2 = function(x) {
      return {
        value: x,
        "fantasy-land/map": function() {
          return this;
        }
      };
    };
    var view3 = /* @__PURE__ */ _curry22(function view4(lens3, x) {
      return lens3(Const2)(x).value;
    });
    module.exports = view3;
  }
});

// node_modules/ramda/src/when.js
var require_when = __commonJS({
  "node_modules/ramda/src/when.js"(exports, module) {
    var _curry32 = require_curry3();
    var when3 = /* @__PURE__ */ _curry32(function when4(pred, whenTrueFn, x) {
      return pred(x) ? whenTrueFn(x) : x;
    });
    module.exports = when3;
  }
});

// node_modules/ramda/src/where.js
var require_where = __commonJS({
  "node_modules/ramda/src/where.js"(exports, module) {
    var _curry22 = require_curry2();
    var _has2 = require_has();
    var where3 = /* @__PURE__ */ _curry22(function where4(spec, testObj) {
      for (var prop4 in spec) {
        if (_has2(prop4, spec) && !spec[prop4](testObj[prop4])) {
          return false;
        }
      }
      return true;
    });
    module.exports = where3;
  }
});

// node_modules/ramda/src/whereAny.js
var require_whereAny = __commonJS({
  "node_modules/ramda/src/whereAny.js"(exports, module) {
    var _curry22 = require_curry2();
    var _has2 = require_has();
    var whereAny3 = /* @__PURE__ */ _curry22(function whereAny4(spec, testObj) {
      for (var prop4 in spec) {
        if (_has2(prop4, spec) && spec[prop4](testObj[prop4])) {
          return true;
        }
      }
      return false;
    });
    module.exports = whereAny3;
  }
});

// node_modules/ramda/src/whereEq.js
var require_whereEq = __commonJS({
  "node_modules/ramda/src/whereEq.js"(exports, module) {
    var _curry22 = require_curry2();
    var equals4 = require_equals2();
    var map4 = require_map2();
    var where3 = require_where();
    var whereEq3 = /* @__PURE__ */ _curry22(function whereEq4(spec, testObj) {
      return where3(map4(equals4, spec), testObj);
    });
    module.exports = whereEq3;
  }
});

// node_modules/ramda/src/without.js
var require_without = __commonJS({
  "node_modules/ramda/src/without.js"(exports, module) {
    var _includes2 = require_includes();
    var _curry22 = require_curry2();
    var flip3 = require_flip();
    var reject3 = require_reject();
    var without2 = /* @__PURE__ */ _curry22(function(xs, list) {
      return reject3(flip3(_includes2)(xs), list);
    });
    module.exports = without2;
  }
});

// node_modules/ramda/src/xor.js
var require_xor = __commonJS({
  "node_modules/ramda/src/xor.js"(exports, module) {
    var _curry22 = require_curry2();
    var xor3 = /* @__PURE__ */ _curry22(function xor4(a, b) {
      return Boolean(!a ^ !b);
    });
    module.exports = xor3;
  }
});

// node_modules/ramda/src/xprod.js
var require_xprod = __commonJS({
  "node_modules/ramda/src/xprod.js"(exports, module) {
    var _curry22 = require_curry2();
    var xprod3 = /* @__PURE__ */ _curry22(function xprod4(a, b) {
      var idx = 0;
      var ilen = a.length;
      var j;
      var jlen = b.length;
      var result = [];
      while (idx < ilen) {
        j = 0;
        while (j < jlen) {
          result[result.length] = [a[idx], b[j]];
          j += 1;
        }
        idx += 1;
      }
      return result;
    });
    module.exports = xprod3;
  }
});

// node_modules/ramda/src/zip.js
var require_zip = __commonJS({
  "node_modules/ramda/src/zip.js"(exports, module) {
    var _curry22 = require_curry2();
    var zip3 = /* @__PURE__ */ _curry22(function zip4(a, b) {
      var rv = [];
      var idx = 0;
      var len = Math.min(a.length, b.length);
      while (idx < len) {
        rv[idx] = [a[idx], b[idx]];
        idx += 1;
      }
      return rv;
    });
    module.exports = zip3;
  }
});

// node_modules/ramda/src/zipObj.js
var require_zipObj = __commonJS({
  "node_modules/ramda/src/zipObj.js"(exports, module) {
    var _curry22 = require_curry2();
    var zipObj3 = /* @__PURE__ */ _curry22(function zipObj4(keys6, values4) {
      var idx = 0;
      var len = Math.min(keys6.length, values4.length);
      var out = {};
      while (idx < len) {
        out[keys6[idx]] = values4[idx];
        idx += 1;
      }
      return out;
    });
    module.exports = zipObj3;
  }
});

// node_modules/ramda/src/zipWith.js
var require_zipWith = __commonJS({
  "node_modules/ramda/src/zipWith.js"(exports, module) {
    var _curry32 = require_curry3();
    var zipWith3 = /* @__PURE__ */ _curry32(function zipWith4(fn, a, b) {
      var rv = [];
      var idx = 0;
      var len = Math.min(a.length, b.length);
      while (idx < len) {
        rv[idx] = fn(a[idx], b[idx]);
        idx += 1;
      }
      return rv;
    });
    module.exports = zipWith3;
  }
});

// node_modules/ramda/src/thunkify.js
var require_thunkify = __commonJS({
  "node_modules/ramda/src/thunkify.js"(exports, module) {
    var curryN3 = require_curryN2();
    var _curry12 = require_curry1();
    var thunkify3 = /* @__PURE__ */ _curry12(function thunkify4(fn) {
      return curryN3(fn.length, function createThunk() {
        var fnArgs = arguments;
        return function invokeThunk() {
          return fn.apply(this, fnArgs);
        };
      });
    });
    module.exports = thunkify3;
  }
});

// node_modules/ramda/src/index.js
var require_src = __commonJS({
  "node_modules/ramda/src/index.js"(exports, module) {
    module.exports = {};
    module.exports.F = require_F();
    module.exports.T = require_T();
    module.exports.__ = require__();
    module.exports.add = require_add();
    module.exports.addIndex = require_addIndex();
    module.exports.adjust = require_adjust();
    module.exports.all = require_all();
    module.exports.allPass = require_allPass();
    module.exports.always = require_always();
    module.exports.and = require_and();
    module.exports.any = require_any();
    module.exports.anyPass = require_anyPass();
    module.exports.ap = require_ap();
    module.exports.aperture = require_aperture2();
    module.exports.append = require_append();
    module.exports.apply = require_apply();
    module.exports.applySpec = require_applySpec();
    module.exports.applyTo = require_applyTo();
    module.exports.ascend = require_ascend();
    module.exports.assoc = require_assoc2();
    module.exports.assocPath = require_assocPath();
    module.exports.binary = require_binary();
    module.exports.bind = require_bind();
    module.exports.both = require_both();
    module.exports.call = require_call();
    module.exports.chain = require_chain();
    module.exports.clamp = require_clamp();
    module.exports.clone = require_clone2();
    module.exports.collectBy = require_collectBy();
    module.exports.comparator = require_comparator();
    module.exports.complement = require_complement();
    module.exports.compose = require_compose();
    module.exports.composeWith = require_composeWith();
    module.exports.concat = require_concat2();
    module.exports.cond = require_cond();
    module.exports.construct = require_construct();
    module.exports.constructN = require_constructN();
    module.exports.converge = require_converge();
    module.exports.count = require_count();
    module.exports.countBy = require_countBy();
    module.exports.curry = require_curry();
    module.exports.curryN = require_curryN2();
    module.exports.dec = require_dec();
    module.exports.defaultTo = require_defaultTo();
    module.exports.descend = require_descend();
    module.exports.difference = require_difference();
    module.exports.differenceWith = require_differenceWith();
    module.exports.dissoc = require_dissoc2();
    module.exports.dissocPath = require_dissocPath();
    module.exports.divide = require_divide();
    module.exports.drop = require_drop();
    module.exports.dropLast = require_dropLast2();
    module.exports.dropLastWhile = require_dropLastWhile2();
    module.exports.dropRepeats = require_dropRepeats();
    module.exports.dropRepeatsWith = require_dropRepeatsWith();
    module.exports.dropWhile = require_dropWhile();
    module.exports.either = require_either();
    module.exports.empty = require_empty();
    module.exports.endsWith = require_endsWith();
    module.exports.eqBy = require_eqBy();
    module.exports.eqProps = require_eqProps();
    module.exports.equals = require_equals2();
    module.exports.evolve = require_evolve();
    module.exports.filter = require_filter2();
    module.exports.find = require_find();
    module.exports.findIndex = require_findIndex();
    module.exports.findLast = require_findLast();
    module.exports.findLastIndex = require_findLastIndex();
    module.exports.flatten = require_flatten();
    module.exports.flip = require_flip();
    module.exports.forEach = require_forEach();
    module.exports.forEachObjIndexed = require_forEachObjIndexed();
    module.exports.fromPairs = require_fromPairs();
    module.exports.groupBy = require_groupBy();
    module.exports.groupWith = require_groupWith();
    module.exports.gt = require_gt();
    module.exports.gte = require_gte();
    module.exports.has = require_has2();
    module.exports.hasIn = require_hasIn();
    module.exports.hasPath = require_hasPath();
    module.exports.head = require_head();
    module.exports.identical = require_identical();
    module.exports.identity = require_identity2();
    module.exports.ifElse = require_ifElse();
    module.exports.inc = require_inc();
    module.exports.includes = require_includes2();
    module.exports.indexBy = require_indexBy();
    module.exports.indexOf = require_indexOf2();
    module.exports.init = require_init();
    module.exports.innerJoin = require_innerJoin();
    module.exports.insert = require_insert();
    module.exports.insertAll = require_insertAll();
    module.exports.intersection = require_intersection();
    module.exports.intersperse = require_intersperse();
    module.exports.into = require_into();
    module.exports.invert = require_invert();
    module.exports.invertObj = require_invertObj();
    module.exports.invoker = require_invoker();
    module.exports.is = require_is();
    module.exports.isEmpty = require_isEmpty();
    module.exports.isNil = require_isNil();
    module.exports.join = require_join();
    module.exports.juxt = require_juxt();
    module.exports.keys = require_keys();
    module.exports.keysIn = require_keysIn();
    module.exports.last = require_last();
    module.exports.lastIndexOf = require_lastIndexOf();
    module.exports.length = require_length();
    module.exports.lens = require_lens();
    module.exports.lensIndex = require_lensIndex();
    module.exports.lensPath = require_lensPath();
    module.exports.lensProp = require_lensProp();
    module.exports.lift = require_lift();
    module.exports.liftN = require_liftN();
    module.exports.lt = require_lt();
    module.exports.lte = require_lte();
    module.exports.map = require_map2();
    module.exports.mapAccum = require_mapAccum();
    module.exports.mapAccumRight = require_mapAccumRight();
    module.exports.mapObjIndexed = require_mapObjIndexed();
    module.exports.match = require_match();
    module.exports.mathMod = require_mathMod();
    module.exports.max = require_max();
    module.exports.maxBy = require_maxBy();
    module.exports.mean = require_mean();
    module.exports.median = require_median();
    module.exports.memoizeWith = require_memoizeWith();
    module.exports.mergeAll = require_mergeAll();
    module.exports.mergeDeepLeft = require_mergeDeepLeft();
    module.exports.mergeDeepRight = require_mergeDeepRight();
    module.exports.mergeDeepWith = require_mergeDeepWith();
    module.exports.mergeDeepWithKey = require_mergeDeepWithKey();
    module.exports.mergeLeft = require_mergeLeft();
    module.exports.mergeRight = require_mergeRight();
    module.exports.mergeWith = require_mergeWith();
    module.exports.mergeWithKey = require_mergeWithKey();
    module.exports.min = require_min();
    module.exports.minBy = require_minBy();
    module.exports.modify = require_modify2();
    module.exports.modifyPath = require_modifyPath();
    module.exports.modulo = require_modulo();
    module.exports.move = require_move();
    module.exports.multiply = require_multiply();
    module.exports.nAry = require_nAry();
    module.exports.partialObject = require_partialObject();
    module.exports.negate = require_negate();
    module.exports.none = require_none();
    module.exports.not = require_not();
    module.exports.nth = require_nth();
    module.exports.nthArg = require_nthArg();
    module.exports.o = require_o();
    module.exports.objOf = require_objOf();
    module.exports.of = require_of2();
    module.exports.omit = require_omit();
    module.exports.on = require_on();
    module.exports.once = require_once();
    module.exports.or = require_or();
    module.exports.otherwise = require_otherwise();
    module.exports.over = require_over();
    module.exports.pair = require_pair();
    module.exports.partial = require_partial();
    module.exports.partialRight = require_partialRight();
    module.exports.partition = require_partition();
    module.exports.path = require_path();
    module.exports.paths = require_paths();
    module.exports.pathEq = require_pathEq();
    module.exports.pathOr = require_pathOr();
    module.exports.pathSatisfies = require_pathSatisfies();
    module.exports.pick = require_pick();
    module.exports.pickAll = require_pickAll();
    module.exports.pickBy = require_pickBy();
    module.exports.pipe = require_pipe2();
    module.exports.pipeWith = require_pipeWith();
    module.exports.pluck = require_pluck();
    module.exports.prepend = require_prepend();
    module.exports.product = require_product();
    module.exports.project = require_project();
    module.exports.promap = require_promap2();
    module.exports.prop = require_prop();
    module.exports.propEq = require_propEq();
    module.exports.propIs = require_propIs();
    module.exports.propOr = require_propOr();
    module.exports.propSatisfies = require_propSatisfies();
    module.exports.props = require_props();
    module.exports.range = require_range();
    module.exports.reduce = require_reduce2();
    module.exports.reduceBy = require_reduceBy();
    module.exports.reduceRight = require_reduceRight();
    module.exports.reduceWhile = require_reduceWhile();
    module.exports.reduced = require_reduced2();
    module.exports.reject = require_reject();
    module.exports.remove = require_remove();
    module.exports.repeat = require_repeat();
    module.exports.replace = require_replace();
    module.exports.reverse = require_reverse();
    module.exports.scan = require_scan2();
    module.exports.sequence = require_sequence();
    module.exports.set = require_set();
    module.exports.slice = require_slice();
    module.exports.sort = require_sort();
    module.exports.sortBy = require_sortBy();
    module.exports.sortWith = require_sortWith();
    module.exports.split = require_split();
    module.exports.splitAt = require_splitAt();
    module.exports.splitEvery = require_splitEvery();
    module.exports.splitWhen = require_splitWhen();
    module.exports.splitWhenever = require_splitWhenever();
    module.exports.startsWith = require_startsWith();
    module.exports.subtract = require_subtract();
    module.exports.sum = require_sum();
    module.exports.symmetricDifference = require_symmetricDifference();
    module.exports.symmetricDifferenceWith = require_symmetricDifferenceWith();
    module.exports.tail = require_tail();
    module.exports.take = require_take();
    module.exports.takeLast = require_takeLast();
    module.exports.takeLastWhile = require_takeLastWhile();
    module.exports.takeWhile = require_takeWhile();
    module.exports.tap = require_tap();
    module.exports.test = require_test();
    module.exports.andThen = require_andThen();
    module.exports.times = require_times();
    module.exports.toLower = require_toLower();
    module.exports.toPairs = require_toPairs();
    module.exports.toPairsIn = require_toPairsIn();
    module.exports.toString = require_toString2();
    module.exports.toUpper = require_toUpper();
    module.exports.transduce = require_transduce();
    module.exports.transpose = require_transpose();
    module.exports.traverse = require_traverse();
    module.exports.trim = require_trim();
    module.exports.tryCatch = require_tryCatch();
    module.exports.type = require_type();
    module.exports.unapply = require_unapply();
    module.exports.unary = require_unary();
    module.exports.uncurryN = require_uncurryN();
    module.exports.unfold = require_unfold();
    module.exports.union = require_union();
    module.exports.unionWith = require_unionWith();
    module.exports.uniq = require_uniq();
    module.exports.uniqBy = require_uniqBy();
    module.exports.uniqWith = require_uniqWith();
    module.exports.unless = require_unless();
    module.exports.unnest = require_unnest();
    module.exports.until = require_until();
    module.exports.unwind = require_unwind();
    module.exports.update = require_update();
    module.exports.useWith = require_useWith();
    module.exports.values = require_values();
    module.exports.valuesIn = require_valuesIn();
    module.exports.view = require_view();
    module.exports.when = require_when();
    module.exports.where = require_where();
    module.exports.whereAny = require_whereAny();
    module.exports.whereEq = require_whereEq();
    module.exports.without = require_without();
    module.exports.xor = require_xor();
    module.exports.xprod = require_xprod();
    module.exports.zip = require_zip();
    module.exports.zipObj = require_zipObj();
    module.exports.zipWith = require_zipWith();
    module.exports.thunkify = require_thunkify();
  }
});

// contracts/warp/lib/version.js
var require_version = __commonJS({
  "contracts/warp/lib/version.js"(exports, module) {
    module.exports = "0.18.0";
  }
});

// node_modules/ramda/es/index.js
var es_exports = {};
__export(es_exports, {
  F: () => F_default,
  T: () => T_default,
  __: () => __default,
  add: () => add_default,
  addIndex: () => addIndex_default,
  adjust: () => adjust_default,
  all: () => all_default,
  allPass: () => allPass_default,
  always: () => always_default,
  and: () => and_default,
  andThen: () => andThen_default,
  any: () => any_default,
  anyPass: () => anyPass_default,
  ap: () => ap_default,
  aperture: () => aperture_default,
  append: () => append_default,
  apply: () => apply_default,
  applySpec: () => applySpec_default,
  applyTo: () => applyTo_default,
  ascend: () => ascend_default,
  assoc: () => assoc_default,
  assocPath: () => assocPath_default,
  binary: () => binary_default,
  bind: () => bind_default,
  both: () => both_default,
  call: () => call_default,
  chain: () => chain_default,
  clamp: () => clamp_default,
  clone: () => clone_default,
  collectBy: () => collectBy_default,
  comparator: () => comparator_default,
  complement: () => complement_default,
  compose: () => compose,
  composeWith: () => composeWith_default,
  concat: () => concat_default,
  cond: () => cond_default,
  construct: () => construct_default,
  constructN: () => constructN_default,
  converge: () => converge_default,
  count: () => count_default,
  countBy: () => countBy_default,
  curry: () => curry_default,
  curryN: () => curryN_default,
  dec: () => dec_default,
  defaultTo: () => defaultTo_default,
  descend: () => descend_default,
  difference: () => difference_default,
  differenceWith: () => differenceWith_default,
  dissoc: () => dissoc_default,
  dissocPath: () => dissocPath_default,
  divide: () => divide_default,
  drop: () => drop_default,
  dropLast: () => dropLast_default,
  dropLastWhile: () => dropLastWhile_default,
  dropRepeats: () => dropRepeats_default,
  dropRepeatsWith: () => dropRepeatsWith_default,
  dropWhile: () => dropWhile_default,
  either: () => either_default,
  empty: () => empty_default,
  endsWith: () => endsWith_default,
  eqBy: () => eqBy_default,
  eqProps: () => eqProps_default,
  equals: () => equals_default,
  evolve: () => evolve_default,
  filter: () => filter_default,
  find: () => find_default,
  findIndex: () => findIndex_default,
  findLast: () => findLast_default,
  findLastIndex: () => findLastIndex_default,
  flatten: () => flatten_default,
  flip: () => flip_default,
  forEach: () => forEach_default,
  forEachObjIndexed: () => forEachObjIndexed_default,
  fromPairs: () => fromPairs_default,
  groupBy: () => groupBy_default,
  groupWith: () => groupWith_default,
  gt: () => gt_default,
  gte: () => gte_default,
  has: () => has_default,
  hasIn: () => hasIn_default,
  hasPath: () => hasPath_default,
  head: () => head_default,
  identical: () => identical_default,
  identity: () => identity_default,
  ifElse: () => ifElse_default,
  inc: () => inc_default,
  includes: () => includes_default,
  indexBy: () => indexBy_default,
  indexOf: () => indexOf_default,
  init: () => init_default,
  innerJoin: () => innerJoin_default,
  insert: () => insert_default,
  insertAll: () => insertAll_default,
  intersection: () => intersection_default,
  intersperse: () => intersperse_default,
  into: () => into_default,
  invert: () => invert_default,
  invertObj: () => invertObj_default,
  invoker: () => invoker_default,
  is: () => is_default,
  isEmpty: () => isEmpty_default,
  isNil: () => isNil_default,
  join: () => join_default,
  juxt: () => juxt_default,
  keys: () => keys_default,
  keysIn: () => keysIn_default,
  last: () => last_default,
  lastIndexOf: () => lastIndexOf_default,
  length: () => length_default,
  lens: () => lens_default,
  lensIndex: () => lensIndex_default,
  lensPath: () => lensPath_default,
  lensProp: () => lensProp_default,
  lift: () => lift_default,
  liftN: () => liftN_default,
  lt: () => lt_default,
  lte: () => lte_default,
  map: () => map_default,
  mapAccum: () => mapAccum_default,
  mapAccumRight: () => mapAccumRight_default,
  mapObjIndexed: () => mapObjIndexed_default,
  match: () => match_default,
  mathMod: () => mathMod_default,
  max: () => max_default,
  maxBy: () => maxBy_default,
  mean: () => mean_default,
  median: () => median_default,
  memoizeWith: () => memoizeWith_default,
  mergeAll: () => mergeAll_default,
  mergeDeepLeft: () => mergeDeepLeft_default,
  mergeDeepRight: () => mergeDeepRight_default,
  mergeDeepWith: () => mergeDeepWith_default,
  mergeDeepWithKey: () => mergeDeepWithKey_default,
  mergeLeft: () => mergeLeft_default,
  mergeRight: () => mergeRight_default,
  mergeWith: () => mergeWith_default,
  mergeWithKey: () => mergeWithKey_default,
  min: () => min_default,
  minBy: () => minBy_default,
  modify: () => modify_default,
  modifyPath: () => modifyPath_default,
  modulo: () => modulo_default,
  move: () => move_default,
  multiply: () => multiply_default,
  nAry: () => nAry_default,
  negate: () => negate_default,
  none: () => none_default,
  not: () => not_default,
  nth: () => nth_default,
  nthArg: () => nthArg_default,
  o: () => o_default,
  objOf: () => objOf_default,
  of: () => of_default,
  omit: () => omit_default,
  on: () => on_default,
  once: () => once_default,
  or: () => or_default,
  otherwise: () => otherwise_default,
  over: () => over_default,
  pair: () => pair_default,
  partial: () => partial_default,
  partialObject: () => partialObject_default,
  partialRight: () => partialRight_default,
  partition: () => partition_default,
  path: () => path_default,
  pathEq: () => pathEq_default,
  pathOr: () => pathOr_default,
  pathSatisfies: () => pathSatisfies_default,
  paths: () => paths_default,
  pick: () => pick_default,
  pickAll: () => pickAll_default,
  pickBy: () => pickBy_default,
  pipe: () => pipe,
  pipeWith: () => pipeWith_default,
  pluck: () => pluck_default,
  prepend: () => prepend_default,
  product: () => product_default,
  project: () => project_default,
  promap: () => promap_default,
  prop: () => prop_default,
  propEq: () => propEq_default,
  propIs: () => propIs_default,
  propOr: () => propOr_default,
  propSatisfies: () => propSatisfies_default,
  props: () => props_default,
  range: () => range_default,
  reduce: () => reduce_default,
  reduceBy: () => reduceBy_default,
  reduceRight: () => reduceRight_default,
  reduceWhile: () => reduceWhile_default,
  reduced: () => reduced_default,
  reject: () => reject_default,
  remove: () => remove_default,
  repeat: () => repeat_default,
  replace: () => replace_default,
  reverse: () => reverse_default,
  scan: () => scan_default,
  sequence: () => sequence_default,
  set: () => set_default,
  slice: () => slice_default,
  sort: () => sort_default,
  sortBy: () => sortBy_default,
  sortWith: () => sortWith_default,
  split: () => split_default,
  splitAt: () => splitAt_default,
  splitEvery: () => splitEvery_default,
  splitWhen: () => splitWhen_default,
  splitWhenever: () => splitWhenever_default,
  startsWith: () => startsWith_default,
  subtract: () => subtract_default,
  sum: () => sum_default,
  symmetricDifference: () => symmetricDifference_default,
  symmetricDifferenceWith: () => symmetricDifferenceWith_default,
  tail: () => tail_default,
  take: () => take_default,
  takeLast: () => takeLast_default,
  takeLastWhile: () => takeLastWhile_default,
  takeWhile: () => takeWhile_default,
  tap: () => tap_default,
  test: () => test_default,
  thunkify: () => thunkify_default,
  times: () => times_default,
  toLower: () => toLower_default,
  toPairs: () => toPairs_default,
  toPairsIn: () => toPairsIn_default,
  toString: () => toString_default,
  toUpper: () => toUpper_default,
  transduce: () => transduce_default,
  transpose: () => transpose_default,
  traverse: () => traverse_default,
  trim: () => trim_default,
  tryCatch: () => tryCatch_default,
  type: () => type_default,
  unapply: () => unapply_default,
  unary: () => unary_default,
  uncurryN: () => uncurryN_default,
  unfold: () => unfold_default,
  union: () => union_default,
  unionWith: () => unionWith_default,
  uniq: () => uniq_default,
  uniqBy: () => uniqBy_default,
  uniqWith: () => uniqWith_default,
  unless: () => unless_default,
  unnest: () => unnest_default,
  until: () => until_default,
  unwind: () => unwind_default,
  update: () => update_default,
  useWith: () => useWith_default,
  values: () => values_default,
  valuesIn: () => valuesIn_default,
  view: () => view_default,
  when: () => when_default,
  where: () => where_default,
  whereAny: () => whereAny_default,
  whereEq: () => whereEq_default,
  without: () => without_default,
  xor: () => xor_default,
  xprod: () => xprod_default,
  zip: () => zip_default,
  zipObj: () => zipObj_default,
  zipWith: () => zipWith_default
});

// node_modules/ramda/es/F.js
var F = function() {
  return false;
};
var F_default = F;

// node_modules/ramda/es/T.js
var T = function() {
  return true;
};
var T_default = T;

// node_modules/ramda/es/__.js
var __default = {
  "@@functional/placeholder": true
};

// node_modules/ramda/es/internal/_isPlaceholder.js
function _isPlaceholder(a) {
  return a != null && typeof a === "object" && a["@@functional/placeholder"] === true;
}

// node_modules/ramda/es/internal/_curry1.js
function _curry1(fn) {
  return function f1(a) {
    if (arguments.length === 0 || _isPlaceholder(a)) {
      return f1;
    } else {
      return fn.apply(this, arguments);
    }
  };
}

// node_modules/ramda/es/internal/_curry2.js
function _curry2(fn) {
  return function f2(a, b) {
    switch (arguments.length) {
      case 0:
        return f2;
      case 1:
        return _isPlaceholder(a) ? f2 : _curry1(function(_b) {
          return fn(a, _b);
        });
      default:
        return _isPlaceholder(a) && _isPlaceholder(b) ? f2 : _isPlaceholder(a) ? _curry1(function(_a) {
          return fn(_a, b);
        }) : _isPlaceholder(b) ? _curry1(function(_b) {
          return fn(a, _b);
        }) : fn(a, b);
    }
  };
}

// node_modules/ramda/es/add.js
var add = /* @__PURE__ */ _curry2(function add2(a, b) {
  return Number(a) + Number(b);
});
var add_default = add;

// node_modules/ramda/es/internal/_concat.js
function _concat(set1, set22) {
  set1 = set1 || [];
  set22 = set22 || [];
  var idx;
  var len1 = set1.length;
  var len2 = set22.length;
  var result = [];
  idx = 0;
  while (idx < len1) {
    result[result.length] = set1[idx];
    idx += 1;
  }
  idx = 0;
  while (idx < len2) {
    result[result.length] = set22[idx];
    idx += 1;
  }
  return result;
}

// node_modules/ramda/es/internal/_arity.js
function _arity(n2, fn) {
  switch (n2) {
    case 0:
      return function() {
        return fn.apply(this, arguments);
      };
    case 1:
      return function(a0) {
        return fn.apply(this, arguments);
      };
    case 2:
      return function(a0, a1) {
        return fn.apply(this, arguments);
      };
    case 3:
      return function(a0, a1, a2) {
        return fn.apply(this, arguments);
      };
    case 4:
      return function(a0, a1, a2, a3) {
        return fn.apply(this, arguments);
      };
    case 5:
      return function(a0, a1, a2, a3, a4) {
        return fn.apply(this, arguments);
      };
    case 6:
      return function(a0, a1, a2, a3, a4, a5) {
        return fn.apply(this, arguments);
      };
    case 7:
      return function(a0, a1, a2, a3, a4, a5, a6) {
        return fn.apply(this, arguments);
      };
    case 8:
      return function(a0, a1, a2, a3, a4, a5, a6, a7) {
        return fn.apply(this, arguments);
      };
    case 9:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
        return fn.apply(this, arguments);
      };
    case 10:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
        return fn.apply(this, arguments);
      };
    default:
      throw new Error("First argument to _arity must be a non-negative integer no greater than ten");
  }
}

// node_modules/ramda/es/internal/_curryN.js
function _curryN(length3, received, fn) {
  return function() {
    var combined = [];
    var argsIdx = 0;
    var left = length3;
    var combinedIdx = 0;
    while (combinedIdx < received.length || argsIdx < arguments.length) {
      var result;
      if (combinedIdx < received.length && (!_isPlaceholder(received[combinedIdx]) || argsIdx >= arguments.length)) {
        result = received[combinedIdx];
      } else {
        result = arguments[argsIdx];
        argsIdx += 1;
      }
      combined[combinedIdx] = result;
      if (!_isPlaceholder(result)) {
        left -= 1;
      }
      combinedIdx += 1;
    }
    return left <= 0 ? fn.apply(this, combined) : _arity(left, _curryN(length3, combined, fn));
  };
}

// node_modules/ramda/es/curryN.js
var curryN = /* @__PURE__ */ _curry2(function curryN2(length3, fn) {
  if (length3 === 1) {
    return _curry1(fn);
  }
  return _arity(length3, _curryN(length3, [], fn));
});
var curryN_default = curryN;

// node_modules/ramda/es/addIndex.js
var addIndex = /* @__PURE__ */ _curry1(function addIndex2(fn) {
  return curryN_default(fn.length, function() {
    var idx = 0;
    var origFn = arguments[0];
    var list = arguments[arguments.length - 1];
    var args = Array.prototype.slice.call(arguments, 0);
    args[0] = function() {
      var result = origFn.apply(this, _concat(arguments, [idx, list]));
      idx += 1;
      return result;
    };
    return fn.apply(this, args);
  });
});
var addIndex_default = addIndex;

// node_modules/ramda/es/internal/_curry3.js
function _curry3(fn) {
  return function f3(a, b, c2) {
    switch (arguments.length) {
      case 0:
        return f3;
      case 1:
        return _isPlaceholder(a) ? f3 : _curry2(function(_b, _c) {
          return fn(a, _b, _c);
        });
      case 2:
        return _isPlaceholder(a) && _isPlaceholder(b) ? f3 : _isPlaceholder(a) ? _curry2(function(_a, _c) {
          return fn(_a, b, _c);
        }) : _isPlaceholder(b) ? _curry2(function(_b, _c) {
          return fn(a, _b, _c);
        }) : _curry1(function(_c) {
          return fn(a, b, _c);
        });
      default:
        return _isPlaceholder(a) && _isPlaceholder(b) && _isPlaceholder(c2) ? f3 : _isPlaceholder(a) && _isPlaceholder(b) ? _curry2(function(_a, _b) {
          return fn(_a, _b, c2);
        }) : _isPlaceholder(a) && _isPlaceholder(c2) ? _curry2(function(_a, _c) {
          return fn(_a, b, _c);
        }) : _isPlaceholder(b) && _isPlaceholder(c2) ? _curry2(function(_b, _c) {
          return fn(a, _b, _c);
        }) : _isPlaceholder(a) ? _curry1(function(_a) {
          return fn(_a, b, c2);
        }) : _isPlaceholder(b) ? _curry1(function(_b) {
          return fn(a, _b, c2);
        }) : _isPlaceholder(c2) ? _curry1(function(_c) {
          return fn(a, b, _c);
        }) : fn(a, b, c2);
    }
  };
}

// node_modules/ramda/es/adjust.js
var adjust = /* @__PURE__ */ _curry3(function adjust2(idx, fn, list) {
  var len = list.length;
  if (idx >= len || idx < -len) {
    return list;
  }
  var _idx = (len + idx) % len;
  var _list = _concat(list);
  _list[_idx] = fn(list[_idx]);
  return _list;
});
var adjust_default = adjust;

// node_modules/ramda/es/internal/_isArray.js
var isArray_default = Array.isArray || function _isArray(val) {
  return val != null && val.length >= 0 && Object.prototype.toString.call(val) === "[object Array]";
};

// node_modules/ramda/es/internal/_isTransformer.js
function _isTransformer(obj) {
  return obj != null && typeof obj["@@transducer/step"] === "function";
}

// node_modules/ramda/es/internal/_dispatchable.js
function _dispatchable(methodNames, transducerCreator, fn) {
  return function() {
    if (arguments.length === 0) {
      return fn();
    }
    var obj = arguments[arguments.length - 1];
    if (!isArray_default(obj)) {
      var idx = 0;
      while (idx < methodNames.length) {
        if (typeof obj[methodNames[idx]] === "function") {
          return obj[methodNames[idx]].apply(obj, Array.prototype.slice.call(arguments, 0, -1));
        }
        idx += 1;
      }
      if (_isTransformer(obj)) {
        var transducer = transducerCreator.apply(null, Array.prototype.slice.call(arguments, 0, -1));
        return transducer(obj);
      }
    }
    return fn.apply(this, arguments);
  };
}

// node_modules/ramda/es/internal/_reduced.js
function _reduced(x) {
  return x && x["@@transducer/reduced"] ? x : {
    "@@transducer/value": x,
    "@@transducer/reduced": true
  };
}

// node_modules/ramda/es/internal/_xfBase.js
var xfBase_default = {
  init: function() {
    return this.xf["@@transducer/init"]();
  },
  result: function(result) {
    return this.xf["@@transducer/result"](result);
  }
};

// node_modules/ramda/es/internal/_xall.js
var XAll = /* @__PURE__ */ function() {
  function XAll2(f, xf) {
    this.xf = xf;
    this.f = f;
    this.all = true;
  }
  XAll2.prototype["@@transducer/init"] = xfBase_default.init;
  XAll2.prototype["@@transducer/result"] = function(result) {
    if (this.all) {
      result = this.xf["@@transducer/step"](result, true);
    }
    return this.xf["@@transducer/result"](result);
  };
  XAll2.prototype["@@transducer/step"] = function(result, input) {
    if (!this.f(input)) {
      this.all = false;
      result = _reduced(this.xf["@@transducer/step"](result, false));
    }
    return result;
  };
  return XAll2;
}();
var _xall = /* @__PURE__ */ _curry2(function _xall2(f, xf) {
  return new XAll(f, xf);
});
var xall_default = _xall;

// node_modules/ramda/es/all.js
var all = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["all"], xall_default, function all2(fn, list) {
    var idx = 0;
    while (idx < list.length) {
      if (!fn(list[idx])) {
        return false;
      }
      idx += 1;
    }
    return true;
  })
);
var all_default = all;

// node_modules/ramda/es/max.js
var max = /* @__PURE__ */ _curry2(function max2(a, b) {
  return b > a ? b : a;
});
var max_default = max;

// node_modules/ramda/es/internal/_map.js
function _map(fn, functor) {
  var idx = 0;
  var len = functor.length;
  var result = Array(len);
  while (idx < len) {
    result[idx] = fn(functor[idx]);
    idx += 1;
  }
  return result;
}

// node_modules/ramda/es/internal/_isString.js
function _isString(x) {
  return Object.prototype.toString.call(x) === "[object String]";
}

// node_modules/ramda/es/internal/_isArrayLike.js
var _isArrayLike = /* @__PURE__ */ _curry1(function isArrayLike(x) {
  if (isArray_default(x)) {
    return true;
  }
  if (!x) {
    return false;
  }
  if (typeof x !== "object") {
    return false;
  }
  if (_isString(x)) {
    return false;
  }
  if (x.length === 0) {
    return true;
  }
  if (x.length > 0) {
    return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
  }
  return false;
});
var isArrayLike_default = _isArrayLike;

// node_modules/ramda/es/internal/_xwrap.js
var XWrap = /* @__PURE__ */ function() {
  function XWrap2(fn) {
    this.f = fn;
  }
  XWrap2.prototype["@@transducer/init"] = function() {
    throw new Error("init not implemented on XWrap");
  };
  XWrap2.prototype["@@transducer/result"] = function(acc) {
    return acc;
  };
  XWrap2.prototype["@@transducer/step"] = function(acc, x) {
    return this.f(acc, x);
  };
  return XWrap2;
}();
function _xwrap(fn) {
  return new XWrap(fn);
}

// node_modules/ramda/es/bind.js
var bind = /* @__PURE__ */ _curry2(function bind2(fn, thisObj) {
  return _arity(fn.length, function() {
    return fn.apply(thisObj, arguments);
  });
});
var bind_default = bind;

// node_modules/ramda/es/internal/_reduce.js
function _arrayReduce(xf, acc, list) {
  var idx = 0;
  var len = list.length;
  while (idx < len) {
    acc = xf["@@transducer/step"](acc, list[idx]);
    if (acc && acc["@@transducer/reduced"]) {
      acc = acc["@@transducer/value"];
      break;
    }
    idx += 1;
  }
  return xf["@@transducer/result"](acc);
}
function _iterableReduce(xf, acc, iter) {
  var step = iter.next();
  while (!step.done) {
    acc = xf["@@transducer/step"](acc, step.value);
    if (acc && acc["@@transducer/reduced"]) {
      acc = acc["@@transducer/value"];
      break;
    }
    step = iter.next();
  }
  return xf["@@transducer/result"](acc);
}
function _methodReduce(xf, acc, obj, methodName) {
  return xf["@@transducer/result"](obj[methodName](bind_default(xf["@@transducer/step"], xf), acc));
}
var symIterator = typeof Symbol !== "undefined" ? Symbol.iterator : "@@iterator";
function _reduce(fn, acc, list) {
  if (typeof fn === "function") {
    fn = _xwrap(fn);
  }
  if (isArrayLike_default(list)) {
    return _arrayReduce(fn, acc, list);
  }
  if (typeof list["fantasy-land/reduce"] === "function") {
    return _methodReduce(fn, acc, list, "fantasy-land/reduce");
  }
  if (list[symIterator] != null) {
    return _iterableReduce(fn, acc, list[symIterator]());
  }
  if (typeof list.next === "function") {
    return _iterableReduce(fn, acc, list);
  }
  if (typeof list.reduce === "function") {
    return _methodReduce(fn, acc, list, "reduce");
  }
  throw new TypeError("reduce: list must be array or iterable");
}

// node_modules/ramda/es/internal/_xmap.js
var XMap = /* @__PURE__ */ function() {
  function XMap2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XMap2.prototype["@@transducer/init"] = xfBase_default.init;
  XMap2.prototype["@@transducer/result"] = xfBase_default.result;
  XMap2.prototype["@@transducer/step"] = function(result, input) {
    return this.xf["@@transducer/step"](result, this.f(input));
  };
  return XMap2;
}();
var _xmap = /* @__PURE__ */ _curry2(function _xmap2(f, xf) {
  return new XMap(f, xf);
});
var xmap_default = _xmap;

// node_modules/ramda/es/internal/_has.js
function _has(prop4, obj) {
  return Object.prototype.hasOwnProperty.call(obj, prop4);
}

// node_modules/ramda/es/internal/_isArguments.js
var toString = Object.prototype.toString;
var _isArguments = /* @__PURE__ */ function() {
  return toString.call(arguments) === "[object Arguments]" ? function _isArguments2(x) {
    return toString.call(x) === "[object Arguments]";
  } : function _isArguments2(x) {
    return _has("callee", x);
  };
}();
var isArguments_default = _isArguments;

// node_modules/ramda/es/keys.js
var hasEnumBug = !/* @__PURE__ */ {
  toString: null
}.propertyIsEnumerable("toString");
var nonEnumerableProps = ["constructor", "valueOf", "isPrototypeOf", "toString", "propertyIsEnumerable", "hasOwnProperty", "toLocaleString"];
var hasArgsEnumBug = /* @__PURE__ */ function() {
  "use strict";
  return arguments.propertyIsEnumerable("length");
}();
var contains = function contains2(list, item) {
  var idx = 0;
  while (idx < list.length) {
    if (list[idx] === item) {
      return true;
    }
    idx += 1;
  }
  return false;
};
var keys = typeof Object.keys === "function" && !hasArgsEnumBug ? /* @__PURE__ */ _curry1(function keys2(obj) {
  return Object(obj) !== obj ? [] : Object.keys(obj);
}) : /* @__PURE__ */ _curry1(function keys3(obj) {
  if (Object(obj) !== obj) {
    return [];
  }
  var prop4, nIdx;
  var ks = [];
  var checkArgsLength = hasArgsEnumBug && isArguments_default(obj);
  for (prop4 in obj) {
    if (_has(prop4, obj) && (!checkArgsLength || prop4 !== "length")) {
      ks[ks.length] = prop4;
    }
  }
  if (hasEnumBug) {
    nIdx = nonEnumerableProps.length - 1;
    while (nIdx >= 0) {
      prop4 = nonEnumerableProps[nIdx];
      if (_has(prop4, obj) && !contains(ks, prop4)) {
        ks[ks.length] = prop4;
      }
      nIdx -= 1;
    }
  }
  return ks;
});
var keys_default = keys;

// node_modules/ramda/es/map.js
var map = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["fantasy-land/map", "map"], xmap_default, function map2(fn, functor) {
    switch (Object.prototype.toString.call(functor)) {
      case "[object Function]":
        return curryN_default(functor.length, function() {
          return fn.call(this, functor.apply(this, arguments));
        });
      case "[object Object]":
        return _reduce(function(acc, key) {
          acc[key] = fn(functor[key]);
          return acc;
        }, {}, keys_default(functor));
      default:
        return _map(fn, functor);
    }
  })
);
var map_default = map;

// node_modules/ramda/es/internal/_isInteger.js
var isInteger_default = Number.isInteger || function _isInteger(n2) {
  return n2 << 0 === n2;
};

// node_modules/ramda/es/nth.js
var nth = /* @__PURE__ */ _curry2(function nth2(offset, list) {
  var idx = offset < 0 ? list.length + offset : offset;
  return _isString(list) ? list.charAt(idx) : list[idx];
});
var nth_default = nth;

// node_modules/ramda/es/prop.js
var prop = /* @__PURE__ */ _curry2(function prop2(p, obj) {
  if (obj == null) {
    return;
  }
  return isInteger_default(p) ? nth_default(p, obj) : obj[p];
});
var prop_default = prop;

// node_modules/ramda/es/pluck.js
var pluck = /* @__PURE__ */ _curry2(function pluck2(p, list) {
  return map_default(prop_default(p), list);
});
var pluck_default = pluck;

// node_modules/ramda/es/reduce.js
var reduce = /* @__PURE__ */ _curry3(_reduce);
var reduce_default = reduce;

// node_modules/ramda/es/allPass.js
var allPass = /* @__PURE__ */ _curry1(function allPass2(preds) {
  return curryN_default(reduce_default(max_default, 0, pluck_default("length", preds)), function() {
    var idx = 0;
    var len = preds.length;
    while (idx < len) {
      if (!preds[idx].apply(this, arguments)) {
        return false;
      }
      idx += 1;
    }
    return true;
  });
});
var allPass_default = allPass;

// node_modules/ramda/es/always.js
var always = /* @__PURE__ */ _curry1(function always2(val) {
  return function() {
    return val;
  };
});
var always_default = always;

// node_modules/ramda/es/and.js
var and = /* @__PURE__ */ _curry2(function and2(a, b) {
  return a && b;
});
var and_default = and;

// node_modules/ramda/es/internal/_xany.js
var XAny = /* @__PURE__ */ function() {
  function XAny2(f, xf) {
    this.xf = xf;
    this.f = f;
    this.any = false;
  }
  XAny2.prototype["@@transducer/init"] = xfBase_default.init;
  XAny2.prototype["@@transducer/result"] = function(result) {
    if (!this.any) {
      result = this.xf["@@transducer/step"](result, false);
    }
    return this.xf["@@transducer/result"](result);
  };
  XAny2.prototype["@@transducer/step"] = function(result, input) {
    if (this.f(input)) {
      this.any = true;
      result = _reduced(this.xf["@@transducer/step"](result, true));
    }
    return result;
  };
  return XAny2;
}();
var _xany = /* @__PURE__ */ _curry2(function _xany2(f, xf) {
  return new XAny(f, xf);
});
var xany_default = _xany;

// node_modules/ramda/es/any.js
var any = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["any"], xany_default, function any2(fn, list) {
    var idx = 0;
    while (idx < list.length) {
      if (fn(list[idx])) {
        return true;
      }
      idx += 1;
    }
    return false;
  })
);
var any_default = any;

// node_modules/ramda/es/anyPass.js
var anyPass = /* @__PURE__ */ _curry1(function anyPass2(preds) {
  return curryN_default(reduce_default(max_default, 0, pluck_default("length", preds)), function() {
    var idx = 0;
    var len = preds.length;
    while (idx < len) {
      if (preds[idx].apply(this, arguments)) {
        return true;
      }
      idx += 1;
    }
    return false;
  });
});
var anyPass_default = anyPass;

// node_modules/ramda/es/ap.js
var ap = /* @__PURE__ */ _curry2(function ap2(applyF, applyX) {
  return typeof applyX["fantasy-land/ap"] === "function" ? applyX["fantasy-land/ap"](applyF) : typeof applyF.ap === "function" ? applyF.ap(applyX) : typeof applyF === "function" ? function(x) {
    return applyF(x)(applyX(x));
  } : _reduce(function(acc, f) {
    return _concat(acc, map_default(f, applyX));
  }, [], applyF);
});
var ap_default = ap;

// node_modules/ramda/es/internal/_aperture.js
function _aperture(n2, list) {
  var idx = 0;
  var limit = list.length - (n2 - 1);
  var acc = new Array(limit >= 0 ? limit : 0);
  while (idx < limit) {
    acc[idx] = Array.prototype.slice.call(list, idx, idx + n2);
    idx += 1;
  }
  return acc;
}

// node_modules/ramda/es/internal/_xaperture.js
var XAperture = /* @__PURE__ */ function() {
  function XAperture2(n2, xf) {
    this.xf = xf;
    this.pos = 0;
    this.full = false;
    this.acc = new Array(n2);
  }
  XAperture2.prototype["@@transducer/init"] = xfBase_default.init;
  XAperture2.prototype["@@transducer/result"] = function(result) {
    this.acc = null;
    return this.xf["@@transducer/result"](result);
  };
  XAperture2.prototype["@@transducer/step"] = function(result, input) {
    this.store(input);
    return this.full ? this.xf["@@transducer/step"](result, this.getCopy()) : result;
  };
  XAperture2.prototype.store = function(input) {
    this.acc[this.pos] = input;
    this.pos += 1;
    if (this.pos === this.acc.length) {
      this.pos = 0;
      this.full = true;
    }
  };
  XAperture2.prototype.getCopy = function() {
    return _concat(Array.prototype.slice.call(this.acc, this.pos), Array.prototype.slice.call(this.acc, 0, this.pos));
  };
  return XAperture2;
}();
var _xaperture = /* @__PURE__ */ _curry2(function _xaperture2(n2, xf) {
  return new XAperture(n2, xf);
});
var xaperture_default = _xaperture;

// node_modules/ramda/es/aperture.js
var aperture = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xaperture_default, _aperture)
);
var aperture_default = aperture;

// node_modules/ramda/es/append.js
var append = /* @__PURE__ */ _curry2(function append2(el, list) {
  return _concat(list, [el]);
});
var append_default = append;

// node_modules/ramda/es/apply.js
var apply = /* @__PURE__ */ _curry2(function apply2(fn, args) {
  return fn.apply(this, args);
});
var apply_default = apply;

// node_modules/ramda/es/values.js
var values = /* @__PURE__ */ _curry1(function values2(obj) {
  var props3 = keys_default(obj);
  var len = props3.length;
  var vals = [];
  var idx = 0;
  while (idx < len) {
    vals[idx] = obj[props3[idx]];
    idx += 1;
  }
  return vals;
});
var values_default = values;

// node_modules/ramda/es/applySpec.js
function mapValues(fn, obj) {
  return isArray_default(obj) ? obj.map(fn) : keys_default(obj).reduce(function(acc, key) {
    acc[key] = fn(obj[key]);
    return acc;
  }, {});
}
var applySpec = /* @__PURE__ */ _curry1(function applySpec2(spec) {
  spec = mapValues(function(v) {
    return typeof v == "function" ? v : applySpec2(v);
  }, spec);
  return curryN_default(reduce_default(max_default, 0, pluck_default("length", values_default(spec))), function() {
    var args = arguments;
    return mapValues(function(f) {
      return apply_default(f, args);
    }, spec);
  });
});
var applySpec_default = applySpec;

// node_modules/ramda/es/applyTo.js
var applyTo = /* @__PURE__ */ _curry2(function applyTo2(x, f) {
  return f(x);
});
var applyTo_default = applyTo;

// node_modules/ramda/es/ascend.js
var ascend = /* @__PURE__ */ _curry3(function ascend2(fn, a, b) {
  var aa = fn(a);
  var bb = fn(b);
  return aa < bb ? -1 : aa > bb ? 1 : 0;
});
var ascend_default = ascend;

// node_modules/ramda/es/internal/_assoc.js
function _assoc(prop4, val, obj) {
  if (isInteger_default(prop4) && isArray_default(obj)) {
    var arr = [].concat(obj);
    arr[prop4] = val;
    return arr;
  }
  var result = {};
  for (var p in obj) {
    result[p] = obj[p];
  }
  result[prop4] = val;
  return result;
}

// node_modules/ramda/es/isNil.js
var isNil = /* @__PURE__ */ _curry1(function isNil2(x) {
  return x == null;
});
var isNil_default = isNil;

// node_modules/ramda/es/assocPath.js
var assocPath = /* @__PURE__ */ _curry3(function assocPath2(path3, val, obj) {
  if (path3.length === 0) {
    return val;
  }
  var idx = path3[0];
  if (path3.length > 1) {
    var nextObj = !isNil_default(obj) && _has(idx, obj) ? obj[idx] : isInteger_default(path3[1]) ? [] : {};
    val = assocPath2(Array.prototype.slice.call(path3, 1), val, nextObj);
  }
  return _assoc(idx, val, obj);
});
var assocPath_default = assocPath;

// node_modules/ramda/es/assoc.js
var assoc = /* @__PURE__ */ _curry3(function assoc2(prop4, val, obj) {
  return assocPath_default([prop4], val, obj);
});
var assoc_default = assoc;

// node_modules/ramda/es/nAry.js
var nAry = /* @__PURE__ */ _curry2(function nAry2(n2, fn) {
  switch (n2) {
    case 0:
      return function() {
        return fn.call(this);
      };
    case 1:
      return function(a0) {
        return fn.call(this, a0);
      };
    case 2:
      return function(a0, a1) {
        return fn.call(this, a0, a1);
      };
    case 3:
      return function(a0, a1, a2) {
        return fn.call(this, a0, a1, a2);
      };
    case 4:
      return function(a0, a1, a2, a3) {
        return fn.call(this, a0, a1, a2, a3);
      };
    case 5:
      return function(a0, a1, a2, a3, a4) {
        return fn.call(this, a0, a1, a2, a3, a4);
      };
    case 6:
      return function(a0, a1, a2, a3, a4, a5) {
        return fn.call(this, a0, a1, a2, a3, a4, a5);
      };
    case 7:
      return function(a0, a1, a2, a3, a4, a5, a6) {
        return fn.call(this, a0, a1, a2, a3, a4, a5, a6);
      };
    case 8:
      return function(a0, a1, a2, a3, a4, a5, a6, a7) {
        return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7);
      };
    case 9:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8) {
        return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8);
      };
    case 10:
      return function(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
        return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
      };
    default:
      throw new Error("First argument to nAry must be a non-negative integer no greater than ten");
  }
});
var nAry_default = nAry;

// node_modules/ramda/es/binary.js
var binary = /* @__PURE__ */ _curry1(function binary2(fn) {
  return nAry_default(2, fn);
});
var binary_default = binary;

// node_modules/ramda/es/internal/_isFunction.js
function _isFunction(x) {
  var type3 = Object.prototype.toString.call(x);
  return type3 === "[object Function]" || type3 === "[object AsyncFunction]" || type3 === "[object GeneratorFunction]" || type3 === "[object AsyncGeneratorFunction]";
}

// node_modules/ramda/es/liftN.js
var liftN = /* @__PURE__ */ _curry2(function liftN2(arity, fn) {
  var lifted = curryN_default(arity, fn);
  return curryN_default(arity, function() {
    return _reduce(ap_default, map_default(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
  });
});
var liftN_default = liftN;

// node_modules/ramda/es/lift.js
var lift = /* @__PURE__ */ _curry1(function lift2(fn) {
  return liftN_default(fn.length, fn);
});
var lift_default = lift;

// node_modules/ramda/es/both.js
var both = /* @__PURE__ */ _curry2(function both2(f, g2) {
  return _isFunction(f) ? function _both() {
    return f.apply(this, arguments) && g2.apply(this, arguments);
  } : lift_default(and_default)(f, g2);
});
var both_default = both;

// node_modules/ramda/es/call.js
var call = /* @__PURE__ */ _curry1(function call2(fn) {
  return fn.apply(this, Array.prototype.slice.call(arguments, 1));
});
var call_default = call;

// node_modules/ramda/es/internal/_makeFlat.js
function _makeFlat(recursive) {
  return function flatt(list) {
    var value, jlen, j;
    var result = [];
    var idx = 0;
    var ilen = list.length;
    while (idx < ilen) {
      if (isArrayLike_default(list[idx])) {
        value = recursive ? flatt(list[idx]) : list[idx];
        j = 0;
        jlen = value.length;
        while (j < jlen) {
          result[result.length] = value[j];
          j += 1;
        }
      } else {
        result[result.length] = list[idx];
      }
      idx += 1;
    }
    return result;
  };
}

// node_modules/ramda/es/internal/_forceReduced.js
function _forceReduced(x) {
  return {
    "@@transducer/value": x,
    "@@transducer/reduced": true
  };
}

// node_modules/ramda/es/internal/_flatCat.js
var preservingReduced = function(xf) {
  return {
    "@@transducer/init": xfBase_default.init,
    "@@transducer/result": function(result) {
      return xf["@@transducer/result"](result);
    },
    "@@transducer/step": function(result, input) {
      var ret = xf["@@transducer/step"](result, input);
      return ret["@@transducer/reduced"] ? _forceReduced(ret) : ret;
    }
  };
};
var _flatCat = function _xcat(xf) {
  var rxf = preservingReduced(xf);
  return {
    "@@transducer/init": xfBase_default.init,
    "@@transducer/result": function(result) {
      return rxf["@@transducer/result"](result);
    },
    "@@transducer/step": function(result, input) {
      return !isArrayLike_default(input) ? _reduce(rxf, result, [input]) : _reduce(rxf, result, input);
    }
  };
};
var flatCat_default = _flatCat;

// node_modules/ramda/es/internal/_xchain.js
var _xchain = /* @__PURE__ */ _curry2(function _xchain2(f, xf) {
  return map_default(f, flatCat_default(xf));
});
var xchain_default = _xchain;

// node_modules/ramda/es/chain.js
var chain = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["fantasy-land/chain", "chain"], xchain_default, function chain2(fn, monad) {
    if (typeof monad === "function") {
      return function(x) {
        return fn(monad(x))(x);
      };
    }
    return _makeFlat(false)(map_default(fn, monad));
  })
);
var chain_default = chain;

// node_modules/ramda/es/clamp.js
var clamp = /* @__PURE__ */ _curry3(function clamp2(min3, max3, value) {
  if (min3 > max3) {
    throw new Error("min must not be greater than max in clamp(min, max, value)");
  }
  return value < min3 ? min3 : value > max3 ? max3 : value;
});
var clamp_default = clamp;

// node_modules/ramda/es/internal/_cloneRegExp.js
function _cloneRegExp(pattern) {
  return new RegExp(pattern.source, (pattern.global ? "g" : "") + (pattern.ignoreCase ? "i" : "") + (pattern.multiline ? "m" : "") + (pattern.sticky ? "y" : "") + (pattern.unicode ? "u" : ""));
}

// node_modules/ramda/es/type.js
var type = /* @__PURE__ */ _curry1(function type2(val) {
  return val === null ? "Null" : val === void 0 ? "Undefined" : Object.prototype.toString.call(val).slice(8, -1);
});
var type_default = type;

// node_modules/ramda/es/internal/_clone.js
function _clone(value, refFrom, refTo, deep) {
  var copy = function copy2(copiedValue) {
    var len = refFrom.length;
    var idx = 0;
    while (idx < len) {
      if (value === refFrom[idx]) {
        return refTo[idx];
      }
      idx += 1;
    }
    refFrom[idx] = value;
    refTo[idx] = copiedValue;
    for (var key in value) {
      if (value.hasOwnProperty(key)) {
        copiedValue[key] = deep ? _clone(value[key], refFrom, refTo, true) : value[key];
      }
    }
    return copiedValue;
  };
  switch (type_default(value)) {
    case "Object":
      return copy(Object.create(Object.getPrototypeOf(value)));
    case "Array":
      return copy([]);
    case "Date":
      return new Date(value.valueOf());
    case "RegExp":
      return _cloneRegExp(value);
    case "Int8Array":
    case "Uint8Array":
    case "Uint8ClampedArray":
    case "Int16Array":
    case "Uint16Array":
    case "Int32Array":
    case "Uint32Array":
    case "Float32Array":
    case "Float64Array":
    case "BigInt64Array":
    case "BigUint64Array":
      return value.slice();
    default:
      return value;
  }
}

// node_modules/ramda/es/clone.js
var clone = /* @__PURE__ */ _curry1(function clone2(value) {
  return value != null && typeof value.clone === "function" ? value.clone() : _clone(value, [], [], true);
});
var clone_default = clone;

// node_modules/ramda/es/collectBy.js
var collectBy = /* @__PURE__ */ _curry2(function collectBy2(fn, list) {
  var group = _reduce(function(o3, x) {
    var tag2 = fn(x);
    if (o3[tag2] === void 0) {
      o3[tag2] = [];
    }
    o3[tag2].push(x);
    return o3;
  }, {}, list);
  var newList = [];
  for (var tag in group) {
    newList.push(group[tag]);
  }
  return newList;
});
var collectBy_default = collectBy;

// node_modules/ramda/es/comparator.js
var comparator = /* @__PURE__ */ _curry1(function comparator2(pred) {
  return function(a, b) {
    return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
  };
});
var comparator_default = comparator;

// node_modules/ramda/es/not.js
var not = /* @__PURE__ */ _curry1(function not2(a) {
  return !a;
});
var not_default = not;

// node_modules/ramda/es/complement.js
var complement = /* @__PURE__ */ lift_default(not_default);
var complement_default = complement;

// node_modules/ramda/es/internal/_pipe.js
function _pipe(f, g2) {
  return function() {
    return g2.call(this, f.apply(this, arguments));
  };
}

// node_modules/ramda/es/internal/_checkForMethod.js
function _checkForMethod(methodname, fn) {
  return function() {
    var length3 = arguments.length;
    if (length3 === 0) {
      return fn();
    }
    var obj = arguments[length3 - 1];
    return isArray_default(obj) || typeof obj[methodname] !== "function" ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length3 - 1));
  };
}

// node_modules/ramda/es/slice.js
var slice = /* @__PURE__ */ _curry3(
  /* @__PURE__ */ _checkForMethod("slice", function slice2(fromIndex, toIndex, list) {
  return Array.prototype.slice.call(list, fromIndex, toIndex);
})
);
var slice_default = slice;

// node_modules/ramda/es/tail.js
var tail = /* @__PURE__ */ _curry1(
  /* @__PURE__ */ _checkForMethod(
    "tail",
  /* @__PURE__ */ slice_default(1, Infinity)
)
);
var tail_default = tail;

// node_modules/ramda/es/pipe.js
function pipe() {
  if (arguments.length === 0) {
    throw new Error("pipe requires at least one argument");
  }
  return _arity(arguments[0].length, reduce_default(_pipe, arguments[0], tail_default(arguments)));
}

// node_modules/ramda/es/reverse.js
var reverse = /* @__PURE__ */ _curry1(function reverse2(list) {
  return _isString(list) ? list.split("").reverse().join("") : Array.prototype.slice.call(list, 0).reverse();
});
var reverse_default = reverse;

// node_modules/ramda/es/compose.js
function compose() {
  if (arguments.length === 0) {
    throw new Error("compose requires at least one argument");
  }
  return pipe.apply(this, reverse_default(arguments));
}

// node_modules/ramda/es/head.js
var head = /* @__PURE__ */ nth_default(0);
var head_default = head;

// node_modules/ramda/es/internal/_identity.js
function _identity(x) {
  return x;
}

// node_modules/ramda/es/identity.js
var identity = /* @__PURE__ */ _curry1(_identity);
var identity_default = identity;

// node_modules/ramda/es/pipeWith.js
var pipeWith = /* @__PURE__ */ _curry2(function pipeWith2(xf, list) {
  if (list.length <= 0) {
    return identity_default;
  }
  var headList = head_default(list);
  var tailList = tail_default(list);
  return _arity(headList.length, function() {
    return _reduce(function(result, f) {
      return xf.call(this, f, result);
    }, headList.apply(this, arguments), tailList);
  });
});
var pipeWith_default = pipeWith;

// node_modules/ramda/es/composeWith.js
var composeWith = /* @__PURE__ */ _curry2(function composeWith2(xf, list) {
  return pipeWith_default.apply(this, [xf, reverse_default(list)]);
});
var composeWith_default = composeWith;

// node_modules/ramda/es/internal/_arrayFromIterator.js
function _arrayFromIterator(iter) {
  var list = [];
  var next;
  while (!(next = iter.next()).done) {
    list.push(next.value);
  }
  return list;
}

// node_modules/ramda/es/internal/_includesWith.js
function _includesWith(pred, x, list) {
  var idx = 0;
  var len = list.length;
  while (idx < len) {
    if (pred(x, list[idx])) {
      return true;
    }
    idx += 1;
  }
  return false;
}

// node_modules/ramda/es/internal/_functionName.js
function _functionName(f) {
  var match3 = String(f).match(/^function (\w*)/);
  return match3 == null ? "" : match3[1];
}

// node_modules/ramda/es/internal/_objectIs.js
function _objectIs(a, b) {
  if (a === b) {
    return a !== 0 || 1 / a === 1 / b;
  } else {
    return a !== a && b !== b;
  }
}
var objectIs_default = typeof Object.is === "function" ? Object.is : _objectIs;

// node_modules/ramda/es/internal/_equals.js
function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
  var a = _arrayFromIterator(aIterator);
  var b = _arrayFromIterator(bIterator);
  function eq(_a, _b) {
    return _equals(_a, _b, stackA.slice(), stackB.slice());
  }
  return !_includesWith(function(b2, aItem) {
    return !_includesWith(eq, aItem, b2);
  }, b, a);
}
function _equals(a, b, stackA, stackB) {
  if (objectIs_default(a, b)) {
    return true;
  }
  var typeA = type_default(a);
  if (typeA !== type_default(b)) {
    return false;
  }
  if (typeof a["fantasy-land/equals"] === "function" || typeof b["fantasy-land/equals"] === "function") {
    return typeof a["fantasy-land/equals"] === "function" && a["fantasy-land/equals"](b) && typeof b["fantasy-land/equals"] === "function" && b["fantasy-land/equals"](a);
  }
  if (typeof a.equals === "function" || typeof b.equals === "function") {
    return typeof a.equals === "function" && a.equals(b) && typeof b.equals === "function" && b.equals(a);
  }
  switch (typeA) {
    case "Arguments":
    case "Array":
    case "Object":
      if (typeof a.constructor === "function" && _functionName(a.constructor) === "Promise") {
      return a === b;
    }
      break;
    case "Boolean":
    case "Number":
    case "String":
      if (!(typeof a === typeof b && objectIs_default(a.valueOf(), b.valueOf()))) {
        return false;
      }
      break;
    case "Date":
      if (!objectIs_default(a.valueOf(), b.valueOf())) {
        return false;
      }
      break;
    case "Error":
      return a.name === b.name && a.message === b.message;
    case "RegExp":
      if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
        return false;
      }
      break;
  }
  var idx = stackA.length - 1;
  while (idx >= 0) {
    if (stackA[idx] === a) {
      return stackB[idx] === b;
    }
    idx -= 1;
  }
  switch (typeA) {
    case "Map":
      if (a.size !== b.size) {
        return false;
      }
      return _uniqContentEquals(a.entries(), b.entries(), stackA.concat([a]), stackB.concat([b]));
    case "Set":
      if (a.size !== b.size) {
        return false;
      }
      return _uniqContentEquals(a.values(), b.values(), stackA.concat([a]), stackB.concat([b]));
    case "Arguments":
    case "Array":
    case "Object":
    case "Boolean":
    case "Number":
    case "String":
    case "Date":
    case "Error":
    case "RegExp":
    case "Int8Array":
    case "Uint8Array":
    case "Uint8ClampedArray":
    case "Int16Array":
    case "Uint16Array":
    case "Int32Array":
    case "Uint32Array":
    case "Float32Array":
    case "Float64Array":
    case "ArrayBuffer":
      break;
    default:
      return false;
  }
  var keysA = keys_default(a);
  if (keysA.length !== keys_default(b).length) {
    return false;
  }
  var extendedStackA = stackA.concat([a]);
  var extendedStackB = stackB.concat([b]);
  idx = keysA.length - 1;
  while (idx >= 0) {
    var key = keysA[idx];
    if (!(_has(key, b) && _equals(b[key], a[key], extendedStackA, extendedStackB))) {
      return false;
    }
    idx -= 1;
  }
  return true;
}

// node_modules/ramda/es/equals.js
var equals = /* @__PURE__ */ _curry2(function equals2(a, b) {
  return _equals(a, b, [], []);
});
var equals_default = equals;

// node_modules/ramda/es/internal/_indexOf.js
function _indexOf(list, a, idx) {
  var inf, item;
  if (typeof list.indexOf === "function") {
    switch (typeof a) {
      case "number":
        if (a === 0) {
          inf = 1 / a;
          while (idx < list.length) {
            item = list[idx];
            if (item === 0 && 1 / item === inf) {
              return idx;
            }
            idx += 1;
          }
          return -1;
        } else if (a !== a) {
          while (idx < list.length) {
            item = list[idx];
            if (typeof item === "number" && item !== item) {
              return idx;
            }
            idx += 1;
          }
          return -1;
        }
        return list.indexOf(a, idx);
      case "string":
      case "boolean":
      case "function":
      case "undefined":
        return list.indexOf(a, idx);
      case "object":
        if (a === null) {
          return list.indexOf(a, idx);
        }
    }
  }
  while (idx < list.length) {
    if (equals_default(list[idx], a)) {
      return idx;
    }
    idx += 1;
  }
  return -1;
}

// node_modules/ramda/es/internal/_includes.js
function _includes(a, list) {
  return _indexOf(list, a, 0) >= 0;
}

// node_modules/ramda/es/internal/_quote.js
function _quote(s) {
  var escaped = s.replace(/\\/g, "\\\\").replace(/[\b]/g, "\\b").replace(/\f/g, "\\f").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\v/g, "\\v").replace(/\0/g, "\\0");
  return '"' + escaped.replace(/"/g, '\\"') + '"';
}

// node_modules/ramda/es/internal/_toISOString.js
var pad = function pad2(n2) {
  return (n2 < 10 ? "0" : "") + n2;
};
var _toISOString = typeof Date.prototype.toISOString === "function" ? function _toISOString2(d) {
  return d.toISOString();
} : function _toISOString3(d) {
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + "." + (d.getUTCMilliseconds() / 1e3).toFixed(3).slice(2, 5) + "Z";
};
var toISOString_default = _toISOString;

// node_modules/ramda/es/internal/_complement.js
function _complement(f) {
  return function() {
    return !f.apply(this, arguments);
  };
}

// node_modules/ramda/es/internal/_filter.js
function _filter(fn, list) {
  var idx = 0;
  var len = list.length;
  var result = [];
  while (idx < len) {
    if (fn(list[idx])) {
      result[result.length] = list[idx];
    }
    idx += 1;
  }
  return result;
}

// node_modules/ramda/es/internal/_isObject.js
function _isObject(x) {
  return Object.prototype.toString.call(x) === "[object Object]";
}

// node_modules/ramda/es/internal/_xfilter.js
var XFilter = /* @__PURE__ */ function() {
  function XFilter2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XFilter2.prototype["@@transducer/init"] = xfBase_default.init;
  XFilter2.prototype["@@transducer/result"] = xfBase_default.result;
  XFilter2.prototype["@@transducer/step"] = function(result, input) {
    return this.f(input) ? this.xf["@@transducer/step"](result, input) : result;
  };
  return XFilter2;
}();
var _xfilter = /* @__PURE__ */ _curry2(function _xfilter2(f, xf) {
  return new XFilter(f, xf);
});
var xfilter_default = _xfilter;

// node_modules/ramda/es/filter.js
var filter = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["fantasy-land/filter", "filter"], xfilter_default, function(pred, filterable) {
    return _isObject(filterable) ? _reduce(function(acc, key) {
      if (pred(filterable[key])) {
        acc[key] = filterable[key];
      }
      return acc;
    }, {}, keys_default(filterable)) : _filter(pred, filterable);
  })
);
var filter_default = filter;

// node_modules/ramda/es/reject.js
var reject = /* @__PURE__ */ _curry2(function reject2(pred, filterable) {
  return filter_default(_complement(pred), filterable);
});
var reject_default = reject;

// node_modules/ramda/es/internal/_toString.js
function _toString(x, seen) {
  var recur = function recur2(y) {
    var xs = seen.concat([x]);
    return _includes(y, xs) ? "<Circular>" : _toString(y, xs);
  };
  var mapPairs = function(obj, keys6) {
    return _map(function(k) {
      return _quote(k) + ": " + recur(obj[k]);
    }, keys6.slice().sort());
  };
  switch (Object.prototype.toString.call(x)) {
    case "[object Arguments]":
      return "(function() { return arguments; }(" + _map(recur, x).join(", ") + "))";
    case "[object Array]":
      return "[" + _map(recur, x).concat(mapPairs(x, reject_default(function(k) {
        return /^\d+$/.test(k);
      }, keys_default(x)))).join(", ") + "]";
    case "[object Boolean]":
      return typeof x === "object" ? "new Boolean(" + recur(x.valueOf()) + ")" : x.toString();
    case "[object Date]":
      return "new Date(" + (isNaN(x.valueOf()) ? recur(NaN) : _quote(toISOString_default(x))) + ")";
    case "[object Null]":
      return "null";
    case "[object Number]":
      return typeof x === "object" ? "new Number(" + recur(x.valueOf()) + ")" : 1 / x === -Infinity ? "-0" : x.toString(10);
    case "[object String]":
      return typeof x === "object" ? "new String(" + recur(x.valueOf()) + ")" : _quote(x);
    case "[object Undefined]":
      return "undefined";
    default:
      if (typeof x.toString === "function") {
      var repr = x.toString();
      if (repr !== "[object Object]") {
        return repr;
      }
    }
      return "{" + mapPairs(x, keys_default(x)).join(", ") + "}";
  }
}

// node_modules/ramda/es/toString.js
var toString2 = /* @__PURE__ */ _curry1(function toString3(val) {
  return _toString(val, []);
});
var toString_default = toString2;

// node_modules/ramda/es/concat.js
var concat = /* @__PURE__ */ _curry2(function concat2(a, b) {
  if (isArray_default(a)) {
    if (isArray_default(b)) {
      return a.concat(b);
    }
    throw new TypeError(toString_default(b) + " is not an array");
  }
  if (_isString(a)) {
    if (_isString(b)) {
      return a + b;
    }
    throw new TypeError(toString_default(b) + " is not a string");
  }
  if (a != null && _isFunction(a["fantasy-land/concat"])) {
    return a["fantasy-land/concat"](b);
  }
  if (a != null && _isFunction(a.concat)) {
    return a.concat(b);
  }
  throw new TypeError(toString_default(a) + ' does not have a method named "concat" or "fantasy-land/concat"');
});
var concat_default = concat;

// node_modules/ramda/es/cond.js
var cond = /* @__PURE__ */ _curry1(function cond2(pairs) {
  var arity = reduce_default(max_default, 0, map_default(function(pair3) {
    return pair3[0].length;
  }, pairs));
  return _arity(arity, function() {
    var idx = 0;
    while (idx < pairs.length) {
      if (pairs[idx][0].apply(this, arguments)) {
        return pairs[idx][1].apply(this, arguments);
      }
      idx += 1;
    }
  });
});
var cond_default = cond;

// node_modules/ramda/es/curry.js
var curry = /* @__PURE__ */ _curry1(function curry2(fn) {
  return curryN_default(fn.length, fn);
});
var curry_default = curry;

// node_modules/ramda/es/constructN.js
var constructN = /* @__PURE__ */ _curry2(function constructN2(n2, Fn) {
  if (n2 > 10) {
    throw new Error("Constructor with greater than ten arguments");
  }
  if (n2 === 0) {
    return function() {
      return new Fn();
    };
  }
  return curry_default(nAry_default(n2, function($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) {
    switch (arguments.length) {
      case 1:
        return new Fn($0);
      case 2:
        return new Fn($0, $1);
      case 3:
        return new Fn($0, $1, $2);
      case 4:
        return new Fn($0, $1, $2, $3);
      case 5:
        return new Fn($0, $1, $2, $3, $4);
      case 6:
        return new Fn($0, $1, $2, $3, $4, $5);
      case 7:
        return new Fn($0, $1, $2, $3, $4, $5, $6);
      case 8:
        return new Fn($0, $1, $2, $3, $4, $5, $6, $7);
      case 9:
        return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8);
      case 10:
        return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8, $9);
    }
  }));
});
var constructN_default = constructN;

// node_modules/ramda/es/construct.js
var construct = /* @__PURE__ */ _curry1(function construct2(Fn) {
  return constructN_default(Fn.length, Fn);
});
var construct_default = construct;

// node_modules/ramda/es/converge.js
var converge = /* @__PURE__ */ _curry2(function converge2(after, fns) {
  return curryN_default(reduce_default(max_default, 0, pluck_default("length", fns)), function() {
    var args = arguments;
    var context = this;
    return after.apply(context, _map(function(fn) {
      return fn.apply(context, args);
    }, fns));
  });
});
var converge_default = converge;

// node_modules/ramda/es/count.js
var count = /* @__PURE__ */ curry_default(function(pred, list) {
  return _reduce(function(a, e) {
    return pred(e) ? a + 1 : a;
  }, 0, list);
});
var count_default = count;

// node_modules/ramda/es/internal/_xreduceBy.js
var XReduceBy = /* @__PURE__ */ function() {
  function XReduceBy2(valueFn, valueAcc, keyFn, xf) {
    this.valueFn = valueFn;
    this.valueAcc = valueAcc;
    this.keyFn = keyFn;
    this.xf = xf;
    this.inputs = {};
  }
  XReduceBy2.prototype["@@transducer/init"] = xfBase_default.init;
  XReduceBy2.prototype["@@transducer/result"] = function(result) {
    var key;
    for (key in this.inputs) {
      if (_has(key, this.inputs)) {
        result = this.xf["@@transducer/step"](result, this.inputs[key]);
        if (result["@@transducer/reduced"]) {
          result = result["@@transducer/value"];
          break;
        }
      }
    }
    this.inputs = null;
    return this.xf["@@transducer/result"](result);
  };
  XReduceBy2.prototype["@@transducer/step"] = function(result, input) {
    var key = this.keyFn(input);
    this.inputs[key] = this.inputs[key] || [key, this.valueAcc];
    this.inputs[key][1] = this.valueFn(this.inputs[key][1], input);
    return result;
  };
  return XReduceBy2;
}();
var _xreduceBy = /* @__PURE__ */ _curryN(4, [], function _xreduceBy2(valueFn, valueAcc, keyFn, xf) {
  return new XReduceBy(valueFn, valueAcc, keyFn, xf);
});
var xreduceBy_default = _xreduceBy;

// node_modules/ramda/es/reduceBy.js
var reduceBy = /* @__PURE__ */ _curryN(
  4,
  [],
  /* @__PURE__ */ _dispatchable([], xreduceBy_default, function reduceBy2(valueFn, valueAcc, keyFn, list) {
    return _reduce(function(acc, elt) {
      var key = keyFn(elt);
      var value = valueFn(_has(key, acc) ? acc[key] : _clone(valueAcc, [], [], false), elt);
      if (value && value["@@transducer/reduced"]) {
        return _reduced(acc);
      }
      acc[key] = value;
      return acc;
    }, {}, list);
  })
);
var reduceBy_default = reduceBy;

// node_modules/ramda/es/countBy.js
var countBy = /* @__PURE__ */ reduceBy_default(function(acc, elem) {
  return acc + 1;
}, 0);
var countBy_default = countBy;

// node_modules/ramda/es/dec.js
var dec = /* @__PURE__ */ add_default(-1);
var dec_default = dec;

// node_modules/ramda/es/defaultTo.js
var defaultTo = /* @__PURE__ */ _curry2(function defaultTo2(d, v) {
  return v == null || v !== v ? d : v;
});
var defaultTo_default = defaultTo;

// node_modules/ramda/es/descend.js
var descend = /* @__PURE__ */ _curry3(function descend2(fn, a, b) {
  var aa = fn(a);
  var bb = fn(b);
  return aa > bb ? -1 : aa < bb ? 1 : 0;
});
var descend_default = descend;

// node_modules/ramda/es/internal/_Set.js
var _Set = /* @__PURE__ */ function() {
  function _Set2() {
    this._nativeSet = typeof Set === "function" ? /* @__PURE__ */ new Set() : null;
    this._items = {};
  }
  _Set2.prototype.add = function(item) {
    return !hasOrAdd(item, true, this);
  };
  _Set2.prototype.has = function(item) {
    return hasOrAdd(item, false, this);
  };
  return _Set2;
}();
function hasOrAdd(item, shouldAdd, set4) {
  var type3 = typeof item;
  var prevSize, newSize;
  switch (type3) {
    case "string":
    case "number":
      if (item === 0 && 1 / item === -Infinity) {
        if (set4._items["-0"]) {
          return true;
        } else {
          if (shouldAdd) {
            set4._items["-0"] = true;
          }
          return false;
        }
      }
      if (set4._nativeSet !== null) {
        if (shouldAdd) {
          prevSize = set4._nativeSet.size;
          set4._nativeSet.add(item);
          newSize = set4._nativeSet.size;
          return newSize === prevSize;
        } else {
          return set4._nativeSet.has(item);
        }
      } else {
        if (!(type3 in set4._items)) {
          if (shouldAdd) {
            set4._items[type3] = {};
            set4._items[type3][item] = true;
          }
          return false;
        } else if (item in set4._items[type3]) {
          return true;
        } else {
          if (shouldAdd) {
            set4._items[type3][item] = true;
          }
          return false;
        }
      }
    case "boolean":
      if (type3 in set4._items) {
        var bIdx = item ? 1 : 0;
        if (set4._items[type3][bIdx]) {
          return true;
        } else {
          if (shouldAdd) {
            set4._items[type3][bIdx] = true;
          }
          return false;
        }
      } else {
        if (shouldAdd) {
          set4._items[type3] = item ? [false, true] : [true, false];
        }
        return false;
      }
    case "function":
      if (set4._nativeSet !== null) {
        if (shouldAdd) {
          prevSize = set4._nativeSet.size;
          set4._nativeSet.add(item);
          newSize = set4._nativeSet.size;
          return newSize === prevSize;
        } else {
          return set4._nativeSet.has(item);
        }
      } else {
        if (!(type3 in set4._items)) {
          if (shouldAdd) {
            set4._items[type3] = [item];
          }
          return false;
        }
        if (!_includes(item, set4._items[type3])) {
          if (shouldAdd) {
            set4._items[type3].push(item);
          }
          return false;
        }
        return true;
      }
    case "undefined":
      if (set4._items[type3]) {
        return true;
      } else {
        if (shouldAdd) {
          set4._items[type3] = true;
        }
        return false;
      }
    case "object":
      if (item === null) {
        if (!set4._items["null"]) {
          if (shouldAdd) {
            set4._items["null"] = true;
          }
          return false;
        }
        return true;
      }
    default:
      type3 = Object.prototype.toString.call(item);
      if (!(type3 in set4._items)) {
        if (shouldAdd) {
          set4._items[type3] = [item];
        }
        return false;
      }
      if (!_includes(item, set4._items[type3])) {
        if (shouldAdd) {
          set4._items[type3].push(item);
        }
        return false;
      }
      return true;
  }
}
var Set_default = _Set;

// node_modules/ramda/es/difference.js
var difference = /* @__PURE__ */ _curry2(function difference2(first, second) {
  var out = [];
  var idx = 0;
  var firstLen = first.length;
  var secondLen = second.length;
  var toFilterOut = new Set_default();
  for (var i = 0; i < secondLen; i += 1) {
    toFilterOut.add(second[i]);
  }
  while (idx < firstLen) {
    if (toFilterOut.add(first[idx])) {
      out[out.length] = first[idx];
    }
    idx += 1;
  }
  return out;
});
var difference_default = difference;

// node_modules/ramda/es/differenceWith.js
var differenceWith = /* @__PURE__ */ _curry3(function differenceWith2(pred, first, second) {
  var out = [];
  var idx = 0;
  var firstLen = first.length;
  while (idx < firstLen) {
    if (!_includesWith(pred, first[idx], second) && !_includesWith(pred, first[idx], out)) {
      out.push(first[idx]);
    }
    idx += 1;
  }
  return out;
});
var differenceWith_default = differenceWith;

// node_modules/ramda/es/remove.js
var remove = /* @__PURE__ */ _curry3(function remove2(start, count2, list) {
  var result = Array.prototype.slice.call(list, 0);
  result.splice(start, count2);
  return result;
});
var remove_default = remove;

// node_modules/ramda/es/internal/_dissoc.js
function _dissoc(prop4, obj) {
  if (obj == null) {
    return obj;
  }
  if (isInteger_default(prop4) && isArray_default(obj)) {
    return remove_default(prop4, 1, obj);
  }
  var result = {};
  for (var p in obj) {
    result[p] = obj[p];
  }
  delete result[prop4];
  return result;
}

// node_modules/ramda/es/dissocPath.js
function _shallowCloneObject(prop4, obj) {
  if (isInteger_default(prop4) && isArray_default(obj)) {
    return [].concat(obj);
  }
  var result = {};
  for (var p in obj) {
    result[p] = obj[p];
  }
  return result;
}
var dissocPath = /* @__PURE__ */ _curry2(function dissocPath2(path3, obj) {
  if (obj == null) {
    return obj;
  }
  switch (path3.length) {
    case 0:
      return obj;
    case 1:
      return _dissoc(path3[0], obj);
    default:
      var head2 = path3[0];
      var tail2 = Array.prototype.slice.call(path3, 1);
      if (obj[head2] == null) {
        return _shallowCloneObject(head2, obj);
      } else {
        return assoc_default(head2, dissocPath2(tail2, obj[head2]), obj);
      }
  }
});
var dissocPath_default = dissocPath;

// node_modules/ramda/es/dissoc.js
var dissoc = /* @__PURE__ */ _curry2(function dissoc2(prop4, obj) {
  return dissocPath_default([prop4], obj);
});
var dissoc_default = dissoc;

// node_modules/ramda/es/divide.js
var divide = /* @__PURE__ */ _curry2(function divide2(a, b) {
  return a / b;
});
var divide_default = divide;

// node_modules/ramda/es/internal/_xdrop.js
var XDrop = /* @__PURE__ */ function() {
  function XDrop2(n2, xf) {
    this.xf = xf;
    this.n = n2;
  }
  XDrop2.prototype["@@transducer/init"] = xfBase_default.init;
  XDrop2.prototype["@@transducer/result"] = xfBase_default.result;
  XDrop2.prototype["@@transducer/step"] = function(result, input) {
    if (this.n > 0) {
      this.n -= 1;
      return result;
    }
    return this.xf["@@transducer/step"](result, input);
  };
  return XDrop2;
}();
var _xdrop = /* @__PURE__ */ _curry2(function _xdrop2(n2, xf) {
  return new XDrop(n2, xf);
});
var xdrop_default = _xdrop;

// node_modules/ramda/es/drop.js
var drop = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["drop"], xdrop_default, function drop2(n2, xs) {
    return slice_default(Math.max(0, n2), Infinity, xs);
  })
);
var drop_default = drop;

// node_modules/ramda/es/internal/_xtake.js
var XTake = /* @__PURE__ */ function() {
  function XTake2(n2, xf) {
    this.xf = xf;
    this.n = n2;
    this.i = 0;
  }
  XTake2.prototype["@@transducer/init"] = xfBase_default.init;
  XTake2.prototype["@@transducer/result"] = xfBase_default.result;
  XTake2.prototype["@@transducer/step"] = function(result, input) {
    this.i += 1;
    var ret = this.n === 0 ? result : this.xf["@@transducer/step"](result, input);
    return this.n >= 0 && this.i >= this.n ? _reduced(ret) : ret;
  };
  return XTake2;
}();
var _xtake = /* @__PURE__ */ _curry2(function _xtake2(n2, xf) {
  return new XTake(n2, xf);
});
var xtake_default = _xtake;

// node_modules/ramda/es/take.js
var take = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["take"], xtake_default, function take2(n2, xs) {
    return slice_default(0, n2 < 0 ? Infinity : n2, xs);
  })
);
var take_default = take;

// node_modules/ramda/es/internal/_dropLast.js
function dropLast(n2, xs) {
  return take_default(n2 < xs.length ? xs.length - n2 : 0, xs);
}

// node_modules/ramda/es/internal/_xdropLast.js
var XDropLast = /* @__PURE__ */ function() {
  function XDropLast2(n2, xf) {
    this.xf = xf;
    this.pos = 0;
    this.full = false;
    this.acc = new Array(n2);
  }
  XDropLast2.prototype["@@transducer/init"] = xfBase_default.init;
  XDropLast2.prototype["@@transducer/result"] = function(result) {
    this.acc = null;
    return this.xf["@@transducer/result"](result);
  };
  XDropLast2.prototype["@@transducer/step"] = function(result, input) {
    if (this.full) {
      result = this.xf["@@transducer/step"](result, this.acc[this.pos]);
    }
    this.store(input);
    return result;
  };
  XDropLast2.prototype.store = function(input) {
    this.acc[this.pos] = input;
    this.pos += 1;
    if (this.pos === this.acc.length) {
      this.pos = 0;
      this.full = true;
    }
  };
  return XDropLast2;
}();
var _xdropLast = /* @__PURE__ */ _curry2(function _xdropLast2(n2, xf) {
  return new XDropLast(n2, xf);
});
var xdropLast_default = _xdropLast;

// node_modules/ramda/es/dropLast.js
var dropLast2 = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xdropLast_default, dropLast)
);
var dropLast_default = dropLast2;

// node_modules/ramda/es/internal/_dropLastWhile.js
function dropLastWhile(pred, xs) {
  var idx = xs.length - 1;
  while (idx >= 0 && pred(xs[idx])) {
    idx -= 1;
  }
  return slice_default(0, idx + 1, xs);
}

// node_modules/ramda/es/internal/_xdropLastWhile.js
var XDropLastWhile = /* @__PURE__ */ function() {
  function XDropLastWhile2(fn, xf) {
    this.f = fn;
    this.retained = [];
    this.xf = xf;
  }
  XDropLastWhile2.prototype["@@transducer/init"] = xfBase_default.init;
  XDropLastWhile2.prototype["@@transducer/result"] = function(result) {
    this.retained = null;
    return this.xf["@@transducer/result"](result);
  };
  XDropLastWhile2.prototype["@@transducer/step"] = function(result, input) {
    return this.f(input) ? this.retain(result, input) : this.flush(result, input);
  };
  XDropLastWhile2.prototype.flush = function(result, input) {
    result = _reduce(this.xf["@@transducer/step"], result, this.retained);
    this.retained = [];
    return this.xf["@@transducer/step"](result, input);
  };
  XDropLastWhile2.prototype.retain = function(result, input) {
    this.retained.push(input);
    return result;
  };
  return XDropLastWhile2;
}();
var _xdropLastWhile = /* @__PURE__ */ _curry2(function _xdropLastWhile2(fn, xf) {
  return new XDropLastWhile(fn, xf);
});
var xdropLastWhile_default = _xdropLastWhile;

// node_modules/ramda/es/dropLastWhile.js
var dropLastWhile2 = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xdropLastWhile_default, dropLastWhile)
);
var dropLastWhile_default = dropLastWhile2;

// node_modules/ramda/es/internal/_xdropRepeatsWith.js
var XDropRepeatsWith = /* @__PURE__ */ function() {
  function XDropRepeatsWith2(pred, xf) {
    this.xf = xf;
    this.pred = pred;
    this.lastValue = void 0;
    this.seenFirstValue = false;
  }
  XDropRepeatsWith2.prototype["@@transducer/init"] = xfBase_default.init;
  XDropRepeatsWith2.prototype["@@transducer/result"] = xfBase_default.result;
  XDropRepeatsWith2.prototype["@@transducer/step"] = function(result, input) {
    var sameAsLast = false;
    if (!this.seenFirstValue) {
      this.seenFirstValue = true;
    } else if (this.pred(this.lastValue, input)) {
      sameAsLast = true;
    }
    this.lastValue = input;
    return sameAsLast ? result : this.xf["@@transducer/step"](result, input);
  };
  return XDropRepeatsWith2;
}();
var _xdropRepeatsWith = /* @__PURE__ */ _curry2(function _xdropRepeatsWith2(pred, xf) {
  return new XDropRepeatsWith(pred, xf);
});
var xdropRepeatsWith_default = _xdropRepeatsWith;

// node_modules/ramda/es/last.js
var last = /* @__PURE__ */ nth_default(-1);
var last_default = last;

// node_modules/ramda/es/dropRepeatsWith.js
var dropRepeatsWith = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xdropRepeatsWith_default, function dropRepeatsWith2(pred, list) {
    var result = [];
    var idx = 1;
    var len = list.length;
    if (len !== 0) {
      result[0] = list[0];
      while (idx < len) {
        if (!pred(last_default(result), list[idx])) {
          result[result.length] = list[idx];
        }
        idx += 1;
      }
    }
    return result;
  })
);
var dropRepeatsWith_default = dropRepeatsWith;

// node_modules/ramda/es/dropRepeats.js
var dropRepeats = /* @__PURE__ */ _curry1(
  /* @__PURE__ */ _dispatchable(
    [],
    /* @__PURE__ */ xdropRepeatsWith_default(equals_default),
    /* @__PURE__ */ dropRepeatsWith_default(equals_default)
  )
);
var dropRepeats_default = dropRepeats;

// node_modules/ramda/es/internal/_xdropWhile.js
var XDropWhile = /* @__PURE__ */ function() {
  function XDropWhile2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XDropWhile2.prototype["@@transducer/init"] = xfBase_default.init;
  XDropWhile2.prototype["@@transducer/result"] = xfBase_default.result;
  XDropWhile2.prototype["@@transducer/step"] = function(result, input) {
    if (this.f) {
      if (this.f(input)) {
        return result;
      }
      this.f = null;
    }
    return this.xf["@@transducer/step"](result, input);
  };
  return XDropWhile2;
}();
var _xdropWhile = /* @__PURE__ */ _curry2(function _xdropWhile2(f, xf) {
  return new XDropWhile(f, xf);
});
var xdropWhile_default = _xdropWhile;

// node_modules/ramda/es/dropWhile.js
var dropWhile = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["dropWhile"], xdropWhile_default, function dropWhile2(pred, xs) {
    var idx = 0;
    var len = xs.length;
    while (idx < len && pred(xs[idx])) {
      idx += 1;
    }
    return slice_default(idx, Infinity, xs);
  })
);
var dropWhile_default = dropWhile;

// node_modules/ramda/es/or.js
var or = /* @__PURE__ */ _curry2(function or2(a, b) {
  return a || b;
});
var or_default = or;

// node_modules/ramda/es/either.js
var either = /* @__PURE__ */ _curry2(function either2(f, g2) {
  return _isFunction(f) ? function _either() {
    return f.apply(this, arguments) || g2.apply(this, arguments);
  } : lift_default(or_default)(f, g2);
});
var either_default = either;

// node_modules/ramda/es/internal/_isTypedArray.js
function _isTypedArray(val) {
  var type3 = Object.prototype.toString.call(val);
  return type3 === "[object Uint8ClampedArray]" || type3 === "[object Int8Array]" || type3 === "[object Uint8Array]" || type3 === "[object Int16Array]" || type3 === "[object Uint16Array]" || type3 === "[object Int32Array]" || type3 === "[object Uint32Array]" || type3 === "[object Float32Array]" || type3 === "[object Float64Array]" || type3 === "[object BigInt64Array]" || type3 === "[object BigUint64Array]";
}

// node_modules/ramda/es/empty.js
var empty = /* @__PURE__ */ _curry1(function empty2(x) {
  return x != null && typeof x["fantasy-land/empty"] === "function" ? x["fantasy-land/empty"]() : x != null && x.constructor != null && typeof x.constructor["fantasy-land/empty"] === "function" ? x.constructor["fantasy-land/empty"]() : x != null && typeof x.empty === "function" ? x.empty() : x != null && x.constructor != null && typeof x.constructor.empty === "function" ? x.constructor.empty() : isArray_default(x) ? [] : _isString(x) ? "" : _isObject(x) ? {} : isArguments_default(x) ? function() {
    return arguments;
  }() : _isTypedArray(x) ? x.constructor.from("") : void 0;
});
var empty_default = empty;

// node_modules/ramda/es/takeLast.js
var takeLast = /* @__PURE__ */ _curry2(function takeLast2(n2, xs) {
  return drop_default(n2 >= 0 ? xs.length - n2 : 0, xs);
});
var takeLast_default = takeLast;

// node_modules/ramda/es/endsWith.js
var endsWith = /* @__PURE__ */ _curry2(function(suffix, list) {
  return equals_default(takeLast_default(suffix.length, list), suffix);
});
var endsWith_default = endsWith;

// node_modules/ramda/es/eqBy.js
var eqBy = /* @__PURE__ */ _curry3(function eqBy2(f, x, y) {
  return equals_default(f(x), f(y));
});
var eqBy_default = eqBy;

// node_modules/ramda/es/eqProps.js
var eqProps = /* @__PURE__ */ _curry3(function eqProps2(prop4, obj1, obj2) {
  return equals_default(obj1[prop4], obj2[prop4]);
});
var eqProps_default = eqProps;

// node_modules/ramda/es/evolve.js
var evolve = /* @__PURE__ */ _curry2(function evolve2(transformations, object) {
  if (!_isObject(object) && !isArray_default(object)) {
    return object;
  }
  var result = object instanceof Array ? [] : {};
  var transformation, key, type3;
  for (key in object) {
    transformation = transformations[key];
    type3 = typeof transformation;
    result[key] = type3 === "function" ? transformation(object[key]) : transformation && type3 === "object" ? evolve2(transformation, object[key]) : object[key];
  }
  return result;
});
var evolve_default = evolve;

// node_modules/ramda/es/internal/_xfind.js
var XFind = /* @__PURE__ */ function() {
  function XFind2(f, xf) {
    this.xf = xf;
    this.f = f;
    this.found = false;
  }
  XFind2.prototype["@@transducer/init"] = xfBase_default.init;
  XFind2.prototype["@@transducer/result"] = function(result) {
    if (!this.found) {
      result = this.xf["@@transducer/step"](result, void 0);
    }
    return this.xf["@@transducer/result"](result);
  };
  XFind2.prototype["@@transducer/step"] = function(result, input) {
    if (this.f(input)) {
      this.found = true;
      result = _reduced(this.xf["@@transducer/step"](result, input));
    }
    return result;
  };
  return XFind2;
}();
var _xfind = /* @__PURE__ */ _curry2(function _xfind2(f, xf) {
  return new XFind(f, xf);
});
var xfind_default = _xfind;

// node_modules/ramda/es/find.js
var find = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["find"], xfind_default, function find2(fn, list) {
    var idx = 0;
    var len = list.length;
    while (idx < len) {
      if (fn(list[idx])) {
        return list[idx];
      }
      idx += 1;
    }
  })
);
var find_default = find;

// node_modules/ramda/es/internal/_xfindIndex.js
var XFindIndex = /* @__PURE__ */ function() {
  function XFindIndex2(f, xf) {
    this.xf = xf;
    this.f = f;
    this.idx = -1;
    this.found = false;
  }
  XFindIndex2.prototype["@@transducer/init"] = xfBase_default.init;
  XFindIndex2.prototype["@@transducer/result"] = function(result) {
    if (!this.found) {
      result = this.xf["@@transducer/step"](result, -1);
    }
    return this.xf["@@transducer/result"](result);
  };
  XFindIndex2.prototype["@@transducer/step"] = function(result, input) {
    this.idx += 1;
    if (this.f(input)) {
      this.found = true;
      result = _reduced(this.xf["@@transducer/step"](result, this.idx));
    }
    return result;
  };
  return XFindIndex2;
}();
var _xfindIndex = /* @__PURE__ */ _curry2(function _xfindIndex2(f, xf) {
  return new XFindIndex(f, xf);
});
var xfindIndex_default = _xfindIndex;

// node_modules/ramda/es/findIndex.js
var findIndex = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xfindIndex_default, function findIndex2(fn, list) {
    var idx = 0;
    var len = list.length;
    while (idx < len) {
      if (fn(list[idx])) {
        return idx;
      }
      idx += 1;
    }
    return -1;
  })
);
var findIndex_default = findIndex;

// node_modules/ramda/es/internal/_xfindLast.js
var XFindLast = /* @__PURE__ */ function() {
  function XFindLast2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XFindLast2.prototype["@@transducer/init"] = xfBase_default.init;
  XFindLast2.prototype["@@transducer/result"] = function(result) {
    return this.xf["@@transducer/result"](this.xf["@@transducer/step"](result, this.last));
  };
  XFindLast2.prototype["@@transducer/step"] = function(result, input) {
    if (this.f(input)) {
      this.last = input;
    }
    return result;
  };
  return XFindLast2;
}();
var _xfindLast = /* @__PURE__ */ _curry2(function _xfindLast2(f, xf) {
  return new XFindLast(f, xf);
});
var xfindLast_default = _xfindLast;

// node_modules/ramda/es/findLast.js
var findLast = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xfindLast_default, function findLast2(fn, list) {
    var idx = list.length - 1;
    while (idx >= 0) {
      if (fn(list[idx])) {
        return list[idx];
      }
      idx -= 1;
    }
  })
);
var findLast_default = findLast;

// node_modules/ramda/es/internal/_xfindLastIndex.js
var XFindLastIndex = /* @__PURE__ */ function() {
  function XFindLastIndex2(f, xf) {
    this.xf = xf;
    this.f = f;
    this.idx = -1;
    this.lastIdx = -1;
  }
  XFindLastIndex2.prototype["@@transducer/init"] = xfBase_default.init;
  XFindLastIndex2.prototype["@@transducer/result"] = function(result) {
    return this.xf["@@transducer/result"](this.xf["@@transducer/step"](result, this.lastIdx));
  };
  XFindLastIndex2.prototype["@@transducer/step"] = function(result, input) {
    this.idx += 1;
    if (this.f(input)) {
      this.lastIdx = this.idx;
    }
    return result;
  };
  return XFindLastIndex2;
}();
var _xfindLastIndex = /* @__PURE__ */ _curry2(function _xfindLastIndex2(f, xf) {
  return new XFindLastIndex(f, xf);
});
var xfindLastIndex_default = _xfindLastIndex;

// node_modules/ramda/es/findLastIndex.js
var findLastIndex = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xfindLastIndex_default, function findLastIndex2(fn, list) {
    var idx = list.length - 1;
    while (idx >= 0) {
      if (fn(list[idx])) {
        return idx;
      }
      idx -= 1;
    }
    return -1;
  })
);
var findLastIndex_default = findLastIndex;

// node_modules/ramda/es/flatten.js
var flatten = /* @__PURE__ */ _curry1(
  /* @__PURE__ */ _makeFlat(true)
);
var flatten_default = flatten;

// node_modules/ramda/es/flip.js
var flip = /* @__PURE__ */ _curry1(function flip2(fn) {
  return curryN_default(fn.length, function(a, b) {
    var args = Array.prototype.slice.call(arguments, 0);
    args[0] = b;
    args[1] = a;
    return fn.apply(this, args);
  });
});
var flip_default = flip;

// node_modules/ramda/es/forEach.js
var forEach = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _checkForMethod("forEach", function forEach2(fn, list) {
  var len = list.length;
  var idx = 0;
  while (idx < len) {
    fn(list[idx]);
    idx += 1;
  }
  return list;
})
);
var forEach_default = forEach;

// node_modules/ramda/es/forEachObjIndexed.js
var forEachObjIndexed = /* @__PURE__ */ _curry2(function forEachObjIndexed2(fn, obj) {
  var keyList = keys_default(obj);
  var idx = 0;
  while (idx < keyList.length) {
    var key = keyList[idx];
    fn(obj[key], key, obj);
    idx += 1;
  }
  return obj;
});
var forEachObjIndexed_default = forEachObjIndexed;

// node_modules/ramda/es/fromPairs.js
var fromPairs = /* @__PURE__ */ _curry1(function fromPairs2(pairs) {
  var result = {};
  var idx = 0;
  while (idx < pairs.length) {
    result[pairs[idx][0]] = pairs[idx][1];
    idx += 1;
  }
  return result;
});
var fromPairs_default = fromPairs;

// node_modules/ramda/es/groupBy.js
var groupBy = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _checkForMethod(
    "groupBy",
  /* @__PURE__ */ reduceBy_default(function(acc, item) {
  acc.push(item);
  return acc;
}, [])
)
);
var groupBy_default = groupBy;

// node_modules/ramda/es/groupWith.js
var groupWith = /* @__PURE__ */ _curry2(function(fn, list) {
  var res = [];
  var idx = 0;
  var len = list.length;
  while (idx < len) {
    var nextidx = idx + 1;
    while (nextidx < len && fn(list[nextidx - 1], list[nextidx])) {
      nextidx += 1;
    }
    res.push(list.slice(idx, nextidx));
    idx = nextidx;
  }
  return res;
});
var groupWith_default = groupWith;

// node_modules/ramda/es/gt.js
var gt = /* @__PURE__ */ _curry2(function gt2(a, b) {
  return a > b;
});
var gt_default = gt;

// node_modules/ramda/es/gte.js
var gte = /* @__PURE__ */ _curry2(function gte2(a, b) {
  return a >= b;
});
var gte_default = gte;

// node_modules/ramda/es/hasPath.js
var hasPath = /* @__PURE__ */ _curry2(function hasPath2(_path, obj) {
  if (_path.length === 0 || isNil_default(obj)) {
    return false;
  }
  var val = obj;
  var idx = 0;
  while (idx < _path.length) {
    if (!isNil_default(val) && _has(_path[idx], val)) {
      val = val[_path[idx]];
      idx += 1;
    } else {
      return false;
    }
  }
  return true;
});
var hasPath_default = hasPath;

// node_modules/ramda/es/has.js
var has = /* @__PURE__ */ _curry2(function has2(prop4, obj) {
  return hasPath_default([prop4], obj);
});
var has_default = has;

// node_modules/ramda/es/hasIn.js
var hasIn = /* @__PURE__ */ _curry2(function hasIn2(prop4, obj) {
  if (isNil_default(obj)) {
    return false;
  }
  return prop4 in obj;
});
var hasIn_default = hasIn;

// node_modules/ramda/es/identical.js
var identical = /* @__PURE__ */ _curry2(objectIs_default);
var identical_default = identical;

// node_modules/ramda/es/ifElse.js
var ifElse = /* @__PURE__ */ _curry3(function ifElse2(condition, onTrue, onFalse) {
  return curryN_default(Math.max(condition.length, onTrue.length, onFalse.length), function _ifElse() {
    return condition.apply(this, arguments) ? onTrue.apply(this, arguments) : onFalse.apply(this, arguments);
  });
});
var ifElse_default = ifElse;

// node_modules/ramda/es/inc.js
var inc = /* @__PURE__ */ add_default(1);
var inc_default = inc;

// node_modules/ramda/es/includes.js
var includes = /* @__PURE__ */ _curry2(_includes);
var includes_default = includes;

// node_modules/ramda/es/indexBy.js
var indexBy = /* @__PURE__ */ reduceBy_default(function(acc, elem) {
  return elem;
}, null);
var indexBy_default = indexBy;

// node_modules/ramda/es/indexOf.js
var indexOf = /* @__PURE__ */ _curry2(function indexOf2(target, xs) {
  return typeof xs.indexOf === "function" && !isArray_default(xs) ? xs.indexOf(target) : _indexOf(xs, target, 0);
});
var indexOf_default = indexOf;

// node_modules/ramda/es/init.js
var init = /* @__PURE__ */ slice_default(0, -1);
var init_default = init;

// node_modules/ramda/es/innerJoin.js
var innerJoin = /* @__PURE__ */ _curry3(function innerJoin2(pred, xs, ys) {
  return _filter(function(x) {
    return _includesWith(pred, x, ys);
  }, xs);
});
var innerJoin_default = innerJoin;

// node_modules/ramda/es/insert.js
var insert = /* @__PURE__ */ _curry3(function insert2(idx, elt, list) {
  idx = idx < list.length && idx >= 0 ? idx : list.length;
  var result = Array.prototype.slice.call(list, 0);
  result.splice(idx, 0, elt);
  return result;
});
var insert_default = insert;

// node_modules/ramda/es/insertAll.js
var insertAll = /* @__PURE__ */ _curry3(function insertAll2(idx, elts, list) {
  idx = idx < list.length && idx >= 0 ? idx : list.length;
  return [].concat(Array.prototype.slice.call(list, 0, idx), elts, Array.prototype.slice.call(list, idx));
});
var insertAll_default = insertAll;

// node_modules/ramda/es/internal/_xuniqBy.js
var XUniqBy = /* @__PURE__ */ function() {
  function XUniqBy2(f, xf) {
    this.xf = xf;
    this.f = f;
    this.set = new Set_default();
  }
  XUniqBy2.prototype["@@transducer/init"] = xfBase_default.init;
  XUniqBy2.prototype["@@transducer/result"] = xfBase_default.result;
  XUniqBy2.prototype["@@transducer/step"] = function(result, input) {
    return this.set.add(this.f(input)) ? this.xf["@@transducer/step"](result, input) : result;
  };
  return XUniqBy2;
}();
var _xuniqBy = /* @__PURE__ */ _curry2(function _xuniqBy2(f, xf) {
  return new XUniqBy(f, xf);
});
var xuniqBy_default = _xuniqBy;

// node_modules/ramda/es/uniqBy.js
var uniqBy = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xuniqBy_default, function(fn, list) {
    var set4 = new Set_default();
    var result = [];
    var idx = 0;
    var appliedItem, item;
    while (idx < list.length) {
      item = list[idx];
      appliedItem = fn(item);
      if (set4.add(appliedItem)) {
        result.push(item);
      }
      idx += 1;
    }
    return result;
  })
);
var uniqBy_default = uniqBy;

// node_modules/ramda/es/uniq.js
var uniq = /* @__PURE__ */ uniqBy_default(identity_default);
var uniq_default = uniq;

// node_modules/ramda/es/intersection.js
var intersection = /* @__PURE__ */ _curry2(function intersection2(list1, list2) {
  var lookupList, filteredList;
  if (list1.length > list2.length) {
    lookupList = list1;
    filteredList = list2;
  } else {
    lookupList = list2;
    filteredList = list1;
  }
  return uniq_default(_filter(flip_default(_includes)(lookupList), filteredList));
});
var intersection_default = intersection;

// node_modules/ramda/es/intersperse.js
var intersperse = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _checkForMethod("intersperse", function intersperse2(separator, list) {
  var out = [];
  var idx = 0;
  var length3 = list.length;
  while (idx < length3) {
    if (idx === length3 - 1) {
      out.push(list[idx]);
    } else {
      out.push(list[idx], separator);
    }
    idx += 1;
  }
  return out;
})
);
var intersperse_default = intersperse;

// node_modules/ramda/es/internal/_objectAssign.js
function _objectAssign(target) {
  if (target == null) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  var output = Object(target);
  var idx = 1;
  var length3 = arguments.length;
  while (idx < length3) {
    var source = arguments[idx];
    if (source != null) {
      for (var nextKey in source) {
        if (_has(nextKey, source)) {
          output[nextKey] = source[nextKey];
        }
      }
    }
    idx += 1;
  }
  return output;
}
var objectAssign_default = typeof Object.assign === "function" ? Object.assign : _objectAssign;

// node_modules/ramda/es/objOf.js
var objOf = /* @__PURE__ */ _curry2(function objOf2(key, val) {
  var obj = {};
  obj[key] = val;
  return obj;
});
var objOf_default = objOf;

// node_modules/ramda/es/internal/_stepCat.js
var _stepCatArray = {
  "@@transducer/init": Array,
  "@@transducer/step": function(xs, x) {
    xs.push(x);
    return xs;
  },
  "@@transducer/result": _identity
};
var _stepCatString = {
  "@@transducer/init": String,
  "@@transducer/step": function(a, b) {
    return a + b;
  },
  "@@transducer/result": _identity
};
var _stepCatObject = {
  "@@transducer/init": Object,
  "@@transducer/step": function(result, input) {
    return objectAssign_default(result, isArrayLike_default(input) ? objOf_default(input[0], input[1]) : input);
  },
  "@@transducer/result": _identity
};
function _stepCat(obj) {
  if (_isTransformer(obj)) {
    return obj;
  }
  if (isArrayLike_default(obj)) {
    return _stepCatArray;
  }
  if (typeof obj === "string") {
    return _stepCatString;
  }
  if (typeof obj === "object") {
    return _stepCatObject;
  }
  throw new Error("Cannot create transformer for " + obj);
}

// node_modules/ramda/es/into.js
var into = /* @__PURE__ */ _curry3(function into2(acc, xf, list) {
  return _isTransformer(acc) ? _reduce(xf(acc), acc["@@transducer/init"](), list) : _reduce(xf(_stepCat(acc)), _clone(acc, [], [], false), list);
});
var into_default = into;

// node_modules/ramda/es/invert.js
var invert = /* @__PURE__ */ _curry1(function invert2(obj) {
  var props3 = keys_default(obj);
  var len = props3.length;
  var idx = 0;
  var out = {};
  while (idx < len) {
    var key = props3[idx];
    var val = obj[key];
    var list = _has(val, out) ? out[val] : out[val] = [];
    list[list.length] = key;
    idx += 1;
  }
  return out;
});
var invert_default = invert;

// node_modules/ramda/es/invertObj.js
var invertObj = /* @__PURE__ */ _curry1(function invertObj2(obj) {
  var props3 = keys_default(obj);
  var len = props3.length;
  var idx = 0;
  var out = {};
  while (idx < len) {
    var key = props3[idx];
    out[obj[key]] = key;
    idx += 1;
  }
  return out;
});
var invertObj_default = invertObj;

// node_modules/ramda/es/invoker.js
var invoker = /* @__PURE__ */ _curry2(function invoker2(arity, method) {
  return curryN_default(arity + 1, function() {
    var target = arguments[arity];
    if (target != null && _isFunction(target[method])) {
      return target[method].apply(target, Array.prototype.slice.call(arguments, 0, arity));
    }
    throw new TypeError(toString_default(target) + ' does not have a method named "' + method + '"');
  });
});
var invoker_default = invoker;

// node_modules/ramda/es/is.js
var is = /* @__PURE__ */ _curry2(function is2(Ctor, val) {
  return val instanceof Ctor || val != null && (val.constructor === Ctor || Ctor.name === "Object" && typeof val === "object");
});
var is_default = is;

// node_modules/ramda/es/isEmpty.js
var isEmpty = /* @__PURE__ */ _curry1(function isEmpty2(x) {
  return x != null && equals_default(x, empty_default(x));
});
var isEmpty_default = isEmpty;

// node_modules/ramda/es/join.js
var join = /* @__PURE__ */ invoker_default(1, "join");
var join_default = join;

// node_modules/ramda/es/juxt.js
var juxt = /* @__PURE__ */ _curry1(function juxt2(fns) {
  return converge_default(function() {
    return Array.prototype.slice.call(arguments, 0);
  }, fns);
});
var juxt_default = juxt;

// node_modules/ramda/es/keysIn.js
var keysIn = /* @__PURE__ */ _curry1(function keysIn2(obj) {
  var prop4;
  var ks = [];
  for (prop4 in obj) {
    ks[ks.length] = prop4;
  }
  return ks;
});
var keysIn_default = keysIn;

// node_modules/ramda/es/lastIndexOf.js
var lastIndexOf = /* @__PURE__ */ _curry2(function lastIndexOf2(target, xs) {
  if (typeof xs.lastIndexOf === "function" && !isArray_default(xs)) {
    return xs.lastIndexOf(target);
  } else {
    var idx = xs.length - 1;
    while (idx >= 0) {
      if (equals_default(xs[idx], target)) {
        return idx;
      }
      idx -= 1;
    }
    return -1;
  }
});
var lastIndexOf_default = lastIndexOf;

// node_modules/ramda/es/internal/_isNumber.js
function _isNumber(x) {
  return Object.prototype.toString.call(x) === "[object Number]";
}

// node_modules/ramda/es/length.js
var length = /* @__PURE__ */ _curry1(function length2(list) {
  return list != null && _isNumber(list.length) ? list.length : NaN;
});
var length_default = length;

// node_modules/ramda/es/lens.js
var lens = /* @__PURE__ */ _curry2(function lens2(getter, setter) {
  return function(toFunctorFn) {
    return function(target) {
      return map_default(function(focus) {
        return setter(focus, target);
      }, toFunctorFn(getter(target)));
    };
  };
});
var lens_default = lens;

// node_modules/ramda/es/update.js
var update = /* @__PURE__ */ _curry3(function update2(idx, x, list) {
  return adjust_default(idx, always_default(x), list);
});
var update_default = update;

// node_modules/ramda/es/lensIndex.js
var lensIndex = /* @__PURE__ */ _curry1(function lensIndex2(n2) {
  return lens_default(nth_default(n2), update_default(n2));
});
var lensIndex_default = lensIndex;

// node_modules/ramda/es/paths.js
var paths = /* @__PURE__ */ _curry2(function paths2(pathsArray, obj) {
  return pathsArray.map(function(paths3) {
    var val = obj;
    var idx = 0;
    var p;
    while (idx < paths3.length) {
      if (val == null) {
        return;
      }
      p = paths3[idx];
      val = isInteger_default(p) ? nth_default(p, val) : val[p];
      idx += 1;
    }
    return val;
  });
});
var paths_default = paths;

// node_modules/ramda/es/path.js
var path = /* @__PURE__ */ _curry2(function path2(pathAr, obj) {
  return paths_default([pathAr], obj)[0];
});
var path_default = path;

// node_modules/ramda/es/lensPath.js
var lensPath = /* @__PURE__ */ _curry1(function lensPath2(p) {
  return lens_default(path_default(p), assocPath_default(p));
});
var lensPath_default = lensPath;

// node_modules/ramda/es/lensProp.js
var lensProp = /* @__PURE__ */ _curry1(function lensProp2(k) {
  return lens_default(prop_default(k), assoc_default(k));
});
var lensProp_default = lensProp;

// node_modules/ramda/es/lt.js
var lt = /* @__PURE__ */ _curry2(function lt2(a, b) {
  return a < b;
});
var lt_default = lt;

// node_modules/ramda/es/lte.js
var lte = /* @__PURE__ */ _curry2(function lte2(a, b) {
  return a <= b;
});
var lte_default = lte;

// node_modules/ramda/es/mapAccum.js
var mapAccum = /* @__PURE__ */ _curry3(function mapAccum2(fn, acc, list) {
  var idx = 0;
  var len = list.length;
  var result = [];
  var tuple = [acc];
  while (idx < len) {
    tuple = fn(tuple[0], list[idx]);
    result[idx] = tuple[1];
    idx += 1;
  }
  return [tuple[0], result];
});
var mapAccum_default = mapAccum;

// node_modules/ramda/es/mapAccumRight.js
var mapAccumRight = /* @__PURE__ */ _curry3(function mapAccumRight2(fn, acc, list) {
  var idx = list.length - 1;
  var result = [];
  var tuple = [acc];
  while (idx >= 0) {
    tuple = fn(tuple[0], list[idx]);
    result[idx] = tuple[1];
    idx -= 1;
  }
  return [tuple[0], result];
});
var mapAccumRight_default = mapAccumRight;

// node_modules/ramda/es/mapObjIndexed.js
var mapObjIndexed = /* @__PURE__ */ _curry2(function mapObjIndexed2(fn, obj) {
  return _reduce(function(acc, key) {
    acc[key] = fn(obj[key], key, obj);
    return acc;
  }, {}, keys_default(obj));
});
var mapObjIndexed_default = mapObjIndexed;

// node_modules/ramda/es/match.js
var match = /* @__PURE__ */ _curry2(function match2(rx, str) {
  return str.match(rx) || [];
});
var match_default = match;

// node_modules/ramda/es/mathMod.js
var mathMod = /* @__PURE__ */ _curry2(function mathMod2(m, p) {
  if (!isInteger_default(m)) {
    return NaN;
  }
  if (!isInteger_default(p) || p < 1) {
    return NaN;
  }
  return (m % p + p) % p;
});
var mathMod_default = mathMod;

// node_modules/ramda/es/maxBy.js
var maxBy = /* @__PURE__ */ _curry3(function maxBy2(f, a, b) {
  return f(b) > f(a) ? b : a;
});
var maxBy_default = maxBy;

// node_modules/ramda/es/sum.js
var sum = /* @__PURE__ */ reduce_default(add_default, 0);
var sum_default = sum;

// node_modules/ramda/es/mean.js
var mean = /* @__PURE__ */ _curry1(function mean2(list) {
  return sum_default(list) / list.length;
});
var mean_default = mean;

// node_modules/ramda/es/median.js
var median = /* @__PURE__ */ _curry1(function median2(list) {
  var len = list.length;
  if (len === 0) {
    return NaN;
  }
  var width = 2 - len % 2;
  var idx = (len - width) / 2;
  return mean_default(Array.prototype.slice.call(list, 0).sort(function(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }).slice(idx, idx + width));
});
var median_default = median;

// node_modules/ramda/es/memoizeWith.js
var memoizeWith = /* @__PURE__ */ _curry2(function memoizeWith2(mFn, fn) {
  var cache = {};
  return _arity(fn.length, function() {
    var key = mFn.apply(this, arguments);
    if (!_has(key, cache)) {
      cache[key] = fn.apply(this, arguments);
    }
    return cache[key];
  });
});
var memoizeWith_default = memoizeWith;

// node_modules/ramda/es/mergeAll.js
var mergeAll = /* @__PURE__ */ _curry1(function mergeAll2(list) {
  return objectAssign_default.apply(null, [{}].concat(list));
});
var mergeAll_default = mergeAll;

// node_modules/ramda/es/mergeWithKey.js
var mergeWithKey = /* @__PURE__ */ _curry3(function mergeWithKey2(fn, l, r) {
  var result = {};
  var k;
  for (k in l) {
    if (_has(k, l)) {
      result[k] = _has(k, r) ? fn(k, l[k], r[k]) : l[k];
    }
  }
  for (k in r) {
    if (_has(k, r) && !_has(k, result)) {
      result[k] = r[k];
    }
  }
  return result;
});
var mergeWithKey_default = mergeWithKey;

// node_modules/ramda/es/mergeDeepWithKey.js
var mergeDeepWithKey = /* @__PURE__ */ _curry3(function mergeDeepWithKey2(fn, lObj, rObj) {
  return mergeWithKey_default(function(k, lVal, rVal) {
    if (_isObject(lVal) && _isObject(rVal)) {
      return mergeDeepWithKey2(fn, lVal, rVal);
    } else {
      return fn(k, lVal, rVal);
    }
  }, lObj, rObj);
});
var mergeDeepWithKey_default = mergeDeepWithKey;

// node_modules/ramda/es/mergeDeepLeft.js
var mergeDeepLeft = /* @__PURE__ */ _curry2(function mergeDeepLeft2(lObj, rObj) {
  return mergeDeepWithKey_default(function(k, lVal, rVal) {
    return lVal;
  }, lObj, rObj);
});
var mergeDeepLeft_default = mergeDeepLeft;

// node_modules/ramda/es/mergeDeepRight.js
var mergeDeepRight = /* @__PURE__ */ _curry2(function mergeDeepRight2(lObj, rObj) {
  return mergeDeepWithKey_default(function(k, lVal, rVal) {
    return rVal;
  }, lObj, rObj);
});
var mergeDeepRight_default = mergeDeepRight;

// node_modules/ramda/es/mergeDeepWith.js
var mergeDeepWith = /* @__PURE__ */ _curry3(function mergeDeepWith2(fn, lObj, rObj) {
  return mergeDeepWithKey_default(function(k, lVal, rVal) {
    return fn(lVal, rVal);
  }, lObj, rObj);
});
var mergeDeepWith_default = mergeDeepWith;

// node_modules/ramda/es/mergeLeft.js
var mergeLeft = /* @__PURE__ */ _curry2(function mergeLeft2(l, r) {
  return objectAssign_default({}, r, l);
});
var mergeLeft_default = mergeLeft;

// node_modules/ramda/es/mergeRight.js
var mergeRight = /* @__PURE__ */ _curry2(function mergeRight2(l, r) {
  return objectAssign_default({}, l, r);
});
var mergeRight_default = mergeRight;

// node_modules/ramda/es/mergeWith.js
var mergeWith = /* @__PURE__ */ _curry3(function mergeWith2(fn, l, r) {
  return mergeWithKey_default(function(_2, _l, _r) {
    return fn(_l, _r);
  }, l, r);
});
var mergeWith_default = mergeWith;

// node_modules/ramda/es/min.js
var min = /* @__PURE__ */ _curry2(function min2(a, b) {
  return b < a ? b : a;
});
var min_default = min;

// node_modules/ramda/es/minBy.js
var minBy = /* @__PURE__ */ _curry3(function minBy2(f, a, b) {
  return f(b) < f(a) ? b : a;
});
var minBy_default = minBy;

// node_modules/ramda/es/internal/_modify.js
function _modify(prop4, fn, obj) {
  if (isInteger_default(prop4) && isArray_default(obj)) {
    var arr = [].concat(obj);
    arr[prop4] = fn(arr[prop4]);
    return arr;
  }
  var result = {};
  for (var p in obj) {
    result[p] = obj[p];
  }
  result[prop4] = fn(result[prop4]);
  return result;
}

// node_modules/ramda/es/modifyPath.js
var modifyPath = /* @__PURE__ */ _curry3(function modifyPath2(path3, fn, object) {
  if (!_isObject(object) && !isArray_default(object) || path3.length === 0) {
    return object;
  }
  var idx = path3[0];
  if (!_has(idx, object)) {
    return object;
  }
  if (path3.length === 1) {
    return _modify(idx, fn, object);
  }
  var val = modifyPath2(Array.prototype.slice.call(path3, 1), fn, object[idx]);
  if (val === object[idx]) {
    return object;
  }
  return _assoc(idx, val, object);
});
var modifyPath_default = modifyPath;

// node_modules/ramda/es/modify.js
var modify = /* @__PURE__ */ _curry3(function modify2(prop4, fn, object) {
  return modifyPath_default([prop4], fn, object);
});
var modify_default = modify;

// node_modules/ramda/es/modulo.js
var modulo = /* @__PURE__ */ _curry2(function modulo2(a, b) {
  return a % b;
});
var modulo_default = modulo;

// node_modules/ramda/es/move.js
var move = /* @__PURE__ */ _curry3(function(from, to, list) {
  var length3 = list.length;
  var result = list.slice();
  var positiveFrom = from < 0 ? length3 + from : from;
  var positiveTo = to < 0 ? length3 + to : to;
  var item = result.splice(positiveFrom, 1);
  return positiveFrom < 0 || positiveFrom >= list.length || positiveTo < 0 || positiveTo >= list.length ? list : [].concat(result.slice(0, positiveTo)).concat(item).concat(result.slice(positiveTo, list.length));
});
var move_default = move;

// node_modules/ramda/es/multiply.js
var multiply = /* @__PURE__ */ _curry2(function multiply2(a, b) {
  return a * b;
});
var multiply_default = multiply;

// node_modules/ramda/es/partialObject.js
var partialObject_default = /* @__PURE__ */ _curry2((f, o3) => (props3) => f.call(void 0, mergeDeepRight_default(o3, props3)));

// node_modules/ramda/es/negate.js
var negate = /* @__PURE__ */ _curry1(function negate2(n2) {
  return -n2;
});
var negate_default = negate;

// node_modules/ramda/es/none.js
var none = /* @__PURE__ */ _curry2(function none2(fn, input) {
  return all_default(_complement(fn), input);
});
var none_default = none;

// node_modules/ramda/es/nthArg.js
var nthArg = /* @__PURE__ */ _curry1(function nthArg2(n2) {
  var arity = n2 < 0 ? 1 : n2 + 1;
  return curryN_default(arity, function() {
    return nth_default(n2, arguments);
  });
});
var nthArg_default = nthArg;

// node_modules/ramda/es/o.js
var o = /* @__PURE__ */ _curry3(function o2(f, g2, x) {
  return f(g2(x));
});
var o_default = o;

// node_modules/ramda/es/internal/_of.js
function _of(x) {
  return [x];
}

// node_modules/ramda/es/of.js
var of = /* @__PURE__ */ _curry1(_of);
var of_default = of;

// node_modules/ramda/es/omit.js
var omit = /* @__PURE__ */ _curry2(function omit2(names, obj) {
  var result = {};
  var index = {};
  var idx = 0;
  var len = names.length;
  while (idx < len) {
    index[names[idx]] = 1;
    idx += 1;
  }
  for (var prop4 in obj) {
    if (!index.hasOwnProperty(prop4)) {
      result[prop4] = obj[prop4];
    }
  }
  return result;
});
var omit_default = omit;

// node_modules/ramda/es/on.js
var on = /* @__PURE__ */ _curryN(4, [], function on2(f, g2, a, b) {
  return f(g2(a), g2(b));
});
var on_default = on;

// node_modules/ramda/es/once.js
var once = /* @__PURE__ */ _curry1(function once2(fn) {
  var called = false;
  var result;
  return _arity(fn.length, function() {
    if (called) {
      return result;
    }
    called = true;
    result = fn.apply(this, arguments);
    return result;
  });
});
var once_default = once;

// node_modules/ramda/es/internal/_assertPromise.js
function _assertPromise(name, p) {
  if (p == null || !_isFunction(p.then)) {
    throw new TypeError("`" + name + "` expected a Promise, received " + _toString(p, []));
  }
}

// node_modules/ramda/es/otherwise.js
var otherwise = /* @__PURE__ */ _curry2(function otherwise2(f, p) {
  _assertPromise("otherwise", p);
  return p.then(null, f);
});
var otherwise_default = otherwise;

// node_modules/ramda/es/over.js
var Identity = function(x) {
  return {
    value: x,
    map: function(f) {
      return Identity(f(x));
    }
  };
};
var over = /* @__PURE__ */ _curry3(function over2(lens3, f, x) {
  return lens3(function(y) {
    return Identity(f(y));
  })(x).value;
});
var over_default = over;

// node_modules/ramda/es/pair.js
var pair = /* @__PURE__ */ _curry2(function pair2(fst, snd) {
  return [fst, snd];
});
var pair_default = pair;

// node_modules/ramda/es/internal/_createPartialApplicator.js
function _createPartialApplicator(concat4) {
  return _curry2(function(fn, args) {
    return _arity(Math.max(0, fn.length - args.length), function() {
      return fn.apply(this, concat4(args, arguments));
    });
  });
}

// node_modules/ramda/es/partial.js
var partial = /* @__PURE__ */ _createPartialApplicator(_concat);
var partial_default = partial;

// node_modules/ramda/es/partialRight.js
var partialRight = /* @__PURE__ */ _createPartialApplicator(
  /* @__PURE__ */ flip_default(_concat)
);
var partialRight_default = partialRight;

// node_modules/ramda/es/partition.js
var partition = /* @__PURE__ */ juxt_default([filter_default, reject_default]);
var partition_default = partition;

// node_modules/ramda/es/pathEq.js
var pathEq = /* @__PURE__ */ _curry3(function pathEq2(_path, val, obj) {
  return equals_default(path_default(_path, obj), val);
});
var pathEq_default = pathEq;

// node_modules/ramda/es/pathOr.js
var pathOr = /* @__PURE__ */ _curry3(function pathOr2(d, p, obj) {
  return defaultTo_default(d, path_default(p, obj));
});
var pathOr_default = pathOr;

// node_modules/ramda/es/pathSatisfies.js
var pathSatisfies = /* @__PURE__ */ _curry3(function pathSatisfies2(pred, propPath, obj) {
  return pred(path_default(propPath, obj));
});
var pathSatisfies_default = pathSatisfies;

// node_modules/ramda/es/pick.js
var pick = /* @__PURE__ */ _curry2(function pick2(names, obj) {
  var result = {};
  var idx = 0;
  while (idx < names.length) {
    if (names[idx] in obj) {
      result[names[idx]] = obj[names[idx]];
    }
    idx += 1;
  }
  return result;
});
var pick_default = pick;

// node_modules/ramda/es/pickAll.js
var pickAll = /* @__PURE__ */ _curry2(function pickAll2(names, obj) {
  var result = {};
  var idx = 0;
  var len = names.length;
  while (idx < len) {
    var name = names[idx];
    result[name] = obj[name];
    idx += 1;
  }
  return result;
});
var pickAll_default = pickAll;

// node_modules/ramda/es/pickBy.js
var pickBy = /* @__PURE__ */ _curry2(function pickBy2(test3, obj) {
  var result = {};
  for (var prop4 in obj) {
    if (test3(obj[prop4], prop4, obj)) {
      result[prop4] = obj[prop4];
    }
  }
  return result;
});
var pickBy_default = pickBy;

// node_modules/ramda/es/prepend.js
var prepend = /* @__PURE__ */ _curry2(function prepend2(el, list) {
  return _concat([el], list);
});
var prepend_default = prepend;

// node_modules/ramda/es/product.js
var product = /* @__PURE__ */ reduce_default(multiply_default, 1);
var product_default = product;

// node_modules/ramda/es/useWith.js
var useWith = /* @__PURE__ */ _curry2(function useWith2(fn, transformers) {
  return curryN_default(transformers.length, function() {
    var args = [];
    var idx = 0;
    while (idx < transformers.length) {
      args.push(transformers[idx].call(this, arguments[idx]));
      idx += 1;
    }
    return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, transformers.length)));
  });
});
var useWith_default = useWith;

// node_modules/ramda/es/project.js
var project = /* @__PURE__ */ useWith_default(_map, [pickAll_default, identity_default]);
var project_default = project;

// node_modules/ramda/es/internal/_promap.js
function _promap(f, g2, profunctor) {
  return function(x) {
    return g2(profunctor(f(x)));
  };
}

// node_modules/ramda/es/internal/_xpromap.js
var XPromap = /* @__PURE__ */ function() {
  function XPromap2(f, g2, xf) {
    this.xf = xf;
    this.f = f;
    this.g = g2;
  }
  XPromap2.prototype["@@transducer/init"] = xfBase_default.init;
  XPromap2.prototype["@@transducer/result"] = xfBase_default.result;
  XPromap2.prototype["@@transducer/step"] = function(result, input) {
    return this.xf["@@transducer/step"](result, _promap(this.f, this.g, input));
  };
  return XPromap2;
}();
var _xpromap = /* @__PURE__ */ _curry3(function _xpromap2(f, g2, xf) {
  return new XPromap(f, g2, xf);
});
var xpromap_default = _xpromap;

// node_modules/ramda/es/promap.js
var promap = /* @__PURE__ */ _curry3(
  /* @__PURE__ */ _dispatchable(["fantasy-land/promap", "promap"], xpromap_default, _promap)
);
var promap_default = promap;

// node_modules/ramda/es/propEq.js
var propEq = /* @__PURE__ */ _curry3(function propEq2(name, val, obj) {
  return equals_default(val, prop_default(name, obj));
});
var propEq_default = propEq;

// node_modules/ramda/es/propIs.js
var propIs = /* @__PURE__ */ _curry3(function propIs2(type3, name, obj) {
  return is_default(type3, prop_default(name, obj));
});
var propIs_default = propIs;

// node_modules/ramda/es/propOr.js
var propOr = /* @__PURE__ */ _curry3(function propOr2(val, p, obj) {
  return defaultTo_default(val, prop_default(p, obj));
});
var propOr_default = propOr;

// node_modules/ramda/es/propSatisfies.js
var propSatisfies = /* @__PURE__ */ _curry3(function propSatisfies2(pred, name, obj) {
  return pred(prop_default(name, obj));
});
var propSatisfies_default = propSatisfies;

// node_modules/ramda/es/props.js
var props = /* @__PURE__ */ _curry2(function props2(ps, obj) {
  return ps.map(function(p) {
    return path_default([p], obj);
  });
});
var props_default = props;

// node_modules/ramda/es/range.js
var range = /* @__PURE__ */ _curry2(function range2(from, to) {
  if (!(_isNumber(from) && _isNumber(to))) {
    throw new TypeError("Both arguments to range must be numbers");
  }
  var result = [];
  var n2 = from;
  while (n2 < to) {
    result.push(n2);
    n2 += 1;
  }
  return result;
});
var range_default = range;

// node_modules/ramda/es/reduceRight.js
var reduceRight = /* @__PURE__ */ _curry3(function reduceRight2(fn, acc, list) {
  var idx = list.length - 1;
  while (idx >= 0) {
    acc = fn(list[idx], acc);
    if (acc && acc["@@transducer/reduced"]) {
      acc = acc["@@transducer/value"];
      break;
    }
    idx -= 1;
  }
  return acc;
});
var reduceRight_default = reduceRight;

// node_modules/ramda/es/reduceWhile.js
var reduceWhile = /* @__PURE__ */ _curryN(4, [], function _reduceWhile(pred, fn, a, list) {
  return _reduce(function(acc, x) {
    return pred(acc, x) ? fn(acc, x) : _reduced(acc);
  }, a, list);
});
var reduceWhile_default = reduceWhile;

// node_modules/ramda/es/reduced.js
var reduced = /* @__PURE__ */ _curry1(_reduced);
var reduced_default = reduced;

// node_modules/ramda/es/times.js
var times = /* @__PURE__ */ _curry2(function times2(fn, n2) {
  var len = Number(n2);
  var idx = 0;
  var list;
  if (len < 0 || isNaN(len)) {
    throw new RangeError("n must be a non-negative number");
  }
  list = new Array(len);
  while (idx < len) {
    list[idx] = fn(idx);
    idx += 1;
  }
  return list;
});
var times_default = times;

// node_modules/ramda/es/repeat.js
var repeat = /* @__PURE__ */ _curry2(function repeat2(value, n2) {
  return times_default(always_default(value), n2);
});
var repeat_default = repeat;

// node_modules/ramda/es/replace.js
var replace = /* @__PURE__ */ _curry3(function replace2(regex, replacement, str) {
  return str.replace(regex, replacement);
});
var replace_default = replace;

// node_modules/ramda/es/scan.js
var scan = /* @__PURE__ */ _curry3(function scan2(fn, acc, list) {
  var idx = 0;
  var len = list.length;
  var result = [acc];
  while (idx < len) {
    acc = fn(acc, list[idx]);
    result[idx + 1] = acc;
    idx += 1;
  }
  return result;
});
var scan_default = scan;

// node_modules/ramda/es/sequence.js
var sequence = /* @__PURE__ */ _curry2(function sequence2(of3, traversable) {
  return typeof traversable.sequence === "function" ? traversable.sequence(of3) : reduceRight_default(function(x, acc) {
    return ap_default(map_default(prepend_default, x), acc);
  }, of3([]), traversable);
});
var sequence_default = sequence;

// node_modules/ramda/es/set.js
var set = /* @__PURE__ */ _curry3(function set2(lens3, v, x) {
  return over_default(lens3, always_default(v), x);
});
var set_default = set;

// node_modules/ramda/es/sort.js
var sort = /* @__PURE__ */ _curry2(function sort2(comparator3, list) {
  return Array.prototype.slice.call(list, 0).sort(comparator3);
});
var sort_default = sort;

// node_modules/ramda/es/sortBy.js
var sortBy = /* @__PURE__ */ _curry2(function sortBy2(fn, list) {
  return Array.prototype.slice.call(list, 0).sort(function(a, b) {
    var aa = fn(a);
    var bb = fn(b);
    return aa < bb ? -1 : aa > bb ? 1 : 0;
  });
});
var sortBy_default = sortBy;

// node_modules/ramda/es/sortWith.js
var sortWith = /* @__PURE__ */ _curry2(function sortWith2(fns, list) {
  return Array.prototype.slice.call(list, 0).sort(function(a, b) {
    var result = 0;
    var i = 0;
    while (result === 0 && i < fns.length) {
      result = fns[i](a, b);
      i += 1;
    }
    return result;
  });
});
var sortWith_default = sortWith;

// node_modules/ramda/es/split.js
var split = /* @__PURE__ */ invoker_default(1, "split");
var split_default = split;

// node_modules/ramda/es/splitAt.js
var splitAt = /* @__PURE__ */ _curry2(function splitAt2(index, array) {
  return [slice_default(0, index, array), slice_default(index, length_default(array), array)];
});
var splitAt_default = splitAt;

// node_modules/ramda/es/splitEvery.js
var splitEvery = /* @__PURE__ */ _curry2(function splitEvery2(n2, list) {
  if (n2 <= 0) {
    throw new Error("First argument to splitEvery must be a positive integer");
  }
  var result = [];
  var idx = 0;
  while (idx < list.length) {
    result.push(slice_default(idx, idx += n2, list));
  }
  return result;
});
var splitEvery_default = splitEvery;

// node_modules/ramda/es/splitWhen.js
var splitWhen = /* @__PURE__ */ _curry2(function splitWhen2(pred, list) {
  var idx = 0;
  var len = list.length;
  var prefix = [];
  while (idx < len && !pred(list[idx])) {
    prefix.push(list[idx]);
    idx += 1;
  }
  return [prefix, Array.prototype.slice.call(list, idx)];
});
var splitWhen_default = splitWhen;

// node_modules/ramda/es/splitWhenever.js
var splitWhenever = /* @__PURE__ */ _curryN(2, [], function splitWhenever2(pred, list) {
  var acc = [];
  var curr = [];
  for (var i = 0; i < list.length; i = i + 1) {
    if (!pred(list[i])) {
      curr.push(list[i]);
    }
    if ((i < list.length - 1 && pred(list[i + 1]) || i === list.length - 1) && curr.length > 0) {
      acc.push(curr);
      curr = [];
    }
  }
  return acc;
});
var splitWhenever_default = splitWhenever;

// node_modules/ramda/es/startsWith.js
var startsWith = /* @__PURE__ */ _curry2(function(prefix, list) {
  return equals_default(take_default(prefix.length, list), prefix);
});
var startsWith_default = startsWith;

// node_modules/ramda/es/subtract.js
var subtract = /* @__PURE__ */ _curry2(function subtract2(a, b) {
  return Number(a) - Number(b);
});
var subtract_default = subtract;

// node_modules/ramda/es/symmetricDifference.js
var symmetricDifference = /* @__PURE__ */ _curry2(function symmetricDifference2(list1, list2) {
  return concat_default(difference_default(list1, list2), difference_default(list2, list1));
});
var symmetricDifference_default = symmetricDifference;

// node_modules/ramda/es/symmetricDifferenceWith.js
var symmetricDifferenceWith = /* @__PURE__ */ _curry3(function symmetricDifferenceWith2(pred, list1, list2) {
  return concat_default(differenceWith_default(pred, list1, list2), differenceWith_default(pred, list2, list1));
});
var symmetricDifferenceWith_default = symmetricDifferenceWith;

// node_modules/ramda/es/takeLastWhile.js
var takeLastWhile = /* @__PURE__ */ _curry2(function takeLastWhile2(fn, xs) {
  var idx = xs.length - 1;
  while (idx >= 0 && fn(xs[idx])) {
    idx -= 1;
  }
  return slice_default(idx + 1, Infinity, xs);
});
var takeLastWhile_default = takeLastWhile;

// node_modules/ramda/es/internal/_xtakeWhile.js
var XTakeWhile = /* @__PURE__ */ function() {
  function XTakeWhile2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XTakeWhile2.prototype["@@transducer/init"] = xfBase_default.init;
  XTakeWhile2.prototype["@@transducer/result"] = xfBase_default.result;
  XTakeWhile2.prototype["@@transducer/step"] = function(result, input) {
    return this.f(input) ? this.xf["@@transducer/step"](result, input) : _reduced(result);
  };
  return XTakeWhile2;
}();
var _xtakeWhile = /* @__PURE__ */ _curry2(function _xtakeWhile2(f, xf) {
  return new XTakeWhile(f, xf);
});
var xtakeWhile_default = _xtakeWhile;

// node_modules/ramda/es/takeWhile.js
var takeWhile = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable(["takeWhile"], xtakeWhile_default, function takeWhile2(fn, xs) {
    var idx = 0;
    var len = xs.length;
    while (idx < len && fn(xs[idx])) {
      idx += 1;
    }
    return slice_default(0, idx, xs);
  })
);
var takeWhile_default = takeWhile;

// node_modules/ramda/es/internal/_xtap.js
var XTap = /* @__PURE__ */ function() {
  function XTap2(f, xf) {
    this.xf = xf;
    this.f = f;
  }
  XTap2.prototype["@@transducer/init"] = xfBase_default.init;
  XTap2.prototype["@@transducer/result"] = xfBase_default.result;
  XTap2.prototype["@@transducer/step"] = function(result, input) {
    this.f(input);
    return this.xf["@@transducer/step"](result, input);
  };
  return XTap2;
}();
var _xtap = /* @__PURE__ */ _curry2(function _xtap2(f, xf) {
  return new XTap(f, xf);
});
var xtap_default = _xtap;

// node_modules/ramda/es/tap.js
var tap = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xtap_default, function tap2(fn, x) {
    fn(x);
    return x;
  })
);
var tap_default = tap;

// node_modules/ramda/es/internal/_isRegExp.js
function _isRegExp(x) {
  return Object.prototype.toString.call(x) === "[object RegExp]";
}

// node_modules/ramda/es/test.js
var test = /* @__PURE__ */ _curry2(function test2(pattern, str) {
  if (!_isRegExp(pattern)) {
    throw new TypeError("\u2018test\u2019 requires a value of type RegExp as its first argument; received " + toString_default(pattern));
  }
  return _cloneRegExp(pattern).test(str);
});
var test_default = test;

// node_modules/ramda/es/andThen.js
var andThen = /* @__PURE__ */ _curry2(function andThen2(f, p) {
  _assertPromise("andThen", p);
  return p.then(f);
});
var andThen_default = andThen;

// node_modules/ramda/es/toLower.js
var toLower = /* @__PURE__ */ invoker_default(0, "toLowerCase");
var toLower_default = toLower;

// node_modules/ramda/es/toPairs.js
var toPairs = /* @__PURE__ */ _curry1(function toPairs2(obj) {
  var pairs = [];
  for (var prop4 in obj) {
    if (_has(prop4, obj)) {
      pairs[pairs.length] = [prop4, obj[prop4]];
    }
  }
  return pairs;
});
var toPairs_default = toPairs;

// node_modules/ramda/es/toPairsIn.js
var toPairsIn = /* @__PURE__ */ _curry1(function toPairsIn2(obj) {
  var pairs = [];
  for (var prop4 in obj) {
    pairs[pairs.length] = [prop4, obj[prop4]];
  }
  return pairs;
});
var toPairsIn_default = toPairsIn;

// node_modules/ramda/es/toUpper.js
var toUpper = /* @__PURE__ */ invoker_default(0, "toUpperCase");
var toUpper_default = toUpper;

// node_modules/ramda/es/transduce.js
var transduce = /* @__PURE__ */ curryN_default(4, function transduce2(xf, fn, acc, list) {
  return _reduce(xf(typeof fn === "function" ? _xwrap(fn) : fn), acc, list);
});
var transduce_default = transduce;

// node_modules/ramda/es/transpose.js
var transpose = /* @__PURE__ */ _curry1(function transpose2(outerlist) {
  var i = 0;
  var result = [];
  while (i < outerlist.length) {
    var innerlist = outerlist[i];
    var j = 0;
    while (j < innerlist.length) {
      if (typeof result[j] === "undefined") {
        result[j] = [];
      }
      result[j].push(innerlist[j]);
      j += 1;
    }
    i += 1;
  }
  return result;
});
var transpose_default = transpose;

// node_modules/ramda/es/traverse.js
var traverse = /* @__PURE__ */ _curry3(function traverse2(of3, f, traversable) {
  return typeof traversable["fantasy-land/traverse"] === "function" ? traversable["fantasy-land/traverse"](f, of3) : typeof traversable.traverse === "function" ? traversable.traverse(f, of3) : sequence_default(of3, map_default(f, traversable));
});
var traverse_default = traverse;

// node_modules/ramda/es/trim.js
var ws = "	\n\v\f\r \xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF";
var zeroWidth = "\u200B";
var hasProtoTrim = typeof String.prototype.trim === "function";
var trim = !hasProtoTrim || /* @__PURE__ */ ws.trim() || !/* @__PURE__ */ zeroWidth.trim() ? /* @__PURE__ */ _curry1(function trim2(str) {
  var beginRx = new RegExp("^[" + ws + "][" + ws + "]*");
  var endRx = new RegExp("[" + ws + "][" + ws + "]*$");
  return str.replace(beginRx, "").replace(endRx, "");
}) : /* @__PURE__ */ _curry1(function trim3(str) {
  return str.trim();
});
var trim_default = trim;

// node_modules/ramda/es/tryCatch.js
var tryCatch = /* @__PURE__ */ _curry2(function _tryCatch(tryer, catcher) {
  return _arity(tryer.length, function() {
    try {
      return tryer.apply(this, arguments);
    } catch (e) {
      return catcher.apply(this, _concat([e], arguments));
    }
  });
});
var tryCatch_default = tryCatch;

// node_modules/ramda/es/unapply.js
var unapply = /* @__PURE__ */ _curry1(function unapply2(fn) {
  return function() {
    return fn(Array.prototype.slice.call(arguments, 0));
  };
});
var unapply_default = unapply;

// node_modules/ramda/es/unary.js
var unary = /* @__PURE__ */ _curry1(function unary2(fn) {
  return nAry_default(1, fn);
});
var unary_default = unary;

// node_modules/ramda/es/uncurryN.js
var uncurryN = /* @__PURE__ */ _curry2(function uncurryN2(depth, fn) {
  return curryN_default(depth, function() {
    var currentDepth = 1;
    var value = fn;
    var idx = 0;
    var endIdx;
    while (currentDepth <= depth && typeof value === "function") {
      endIdx = currentDepth === depth ? arguments.length : idx + value.length;
      value = value.apply(this, Array.prototype.slice.call(arguments, idx, endIdx));
      currentDepth += 1;
      idx = endIdx;
    }
    return value;
  });
});
var uncurryN_default = uncurryN;

// node_modules/ramda/es/unfold.js
var unfold = /* @__PURE__ */ _curry2(function unfold2(fn, seed) {
  var pair3 = fn(seed);
  var result = [];
  while (pair3 && pair3.length) {
    result[result.length] = pair3[0];
    pair3 = fn(pair3[1]);
  }
  return result;
});
var unfold_default = unfold;

// node_modules/ramda/es/union.js
var union = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ compose(uniq_default, _concat)
);
var union_default = union;

// node_modules/ramda/es/internal/_xuniqWith.js
var XUniqWith = /* @__PURE__ */ function() {
  function XUniqWith2(pred, xf) {
    this.xf = xf;
    this.pred = pred;
    this.items = [];
  }
  XUniqWith2.prototype["@@transducer/init"] = xfBase_default.init;
  XUniqWith2.prototype["@@transducer/result"] = xfBase_default.result;
  XUniqWith2.prototype["@@transducer/step"] = function(result, input) {
    if (_includesWith(this.pred, input, this.items)) {
      return result;
    } else {
      this.items.push(input);
      return this.xf["@@transducer/step"](result, input);
    }
  };
  return XUniqWith2;
}();
var _xuniqWith = /* @__PURE__ */ _curry2(function _xuniqWith2(pred, xf) {
  return new XUniqWith(pred, xf);
});
var xuniqWith_default = _xuniqWith;

// node_modules/ramda/es/uniqWith.js
var uniqWith = /* @__PURE__ */ _curry2(
  /* @__PURE__ */ _dispatchable([], xuniqWith_default, function(pred, list) {
    var idx = 0;
    var len = list.length;
    var result = [];
    var item;
    while (idx < len) {
      item = list[idx];
      if (!_includesWith(pred, item, result)) {
        result[result.length] = item;
      }
      idx += 1;
    }
    return result;
  })
);
var uniqWith_default = uniqWith;

// node_modules/ramda/es/unionWith.js
var unionWith = /* @__PURE__ */ _curry3(function unionWith2(pred, list1, list2) {
  return uniqWith_default(pred, _concat(list1, list2));
});
var unionWith_default = unionWith;

// node_modules/ramda/es/unless.js
var unless = /* @__PURE__ */ _curry3(function unless2(pred, whenFalseFn, x) {
  return pred(x) ? x : whenFalseFn(x);
});
var unless_default = unless;

// node_modules/ramda/es/unnest.js
var unnest = /* @__PURE__ */ chain_default(_identity);
var unnest_default = unnest;

// node_modules/ramda/es/until.js
var until = /* @__PURE__ */ _curry3(function until2(pred, fn, init2) {
  var val = init2;
  while (!pred(val)) {
    val = fn(val);
  }
  return val;
});
var until_default = until;

// node_modules/ramda/es/unwind.js
var unwind = /* @__PURE__ */ _curry2(function(key, object) {
  if (!(key in object && isArray_default(object[key]))) {
    return [object];
  }
  return _map(function(item) {
    return _assoc(key, item, object);
  }, object[key]);
});
var unwind_default = unwind;

// node_modules/ramda/es/valuesIn.js
var valuesIn = /* @__PURE__ */ _curry1(function valuesIn2(obj) {
  var prop4;
  var vs = [];
  for (prop4 in obj) {
    vs[vs.length] = obj[prop4];
  }
  return vs;
});
var valuesIn_default = valuesIn;

// node_modules/ramda/es/view.js
var Const = function(x) {
  return {
    value: x,
    "fantasy-land/map": function() {
      return this;
    }
  };
};
var view = /* @__PURE__ */ _curry2(function view2(lens3, x) {
  return lens3(Const)(x).value;
});
var view_default = view;

// node_modules/ramda/es/when.js
var when = /* @__PURE__ */ _curry3(function when2(pred, whenTrueFn, x) {
  return pred(x) ? whenTrueFn(x) : x;
});
var when_default = when;

// node_modules/ramda/es/where.js
var where = /* @__PURE__ */ _curry2(function where2(spec, testObj) {
  for (var prop4 in spec) {
    if (_has(prop4, spec) && !spec[prop4](testObj[prop4])) {
      return false;
    }
  }
  return true;
});
var where_default = where;

// node_modules/ramda/es/whereAny.js
var whereAny = /* @__PURE__ */ _curry2(function whereAny2(spec, testObj) {
  for (var prop4 in spec) {
    if (_has(prop4, spec) && spec[prop4](testObj[prop4])) {
      return true;
    }
  }
  return false;
});
var whereAny_default = whereAny;

// node_modules/ramda/es/whereEq.js
var whereEq = /* @__PURE__ */ _curry2(function whereEq2(spec, testObj) {
  return where_default(map_default(equals_default, spec), testObj);
});
var whereEq_default = whereEq;

// node_modules/ramda/es/without.js
var without = /* @__PURE__ */ _curry2(function(xs, list) {
  return reject_default(flip_default(_includes)(xs), list);
});
var without_default = without;

// node_modules/ramda/es/xor.js
var xor = /* @__PURE__ */ _curry2(function xor2(a, b) {
  return Boolean(!a ^ !b);
});
var xor_default = xor;

// node_modules/ramda/es/xprod.js
var xprod = /* @__PURE__ */ _curry2(function xprod2(a, b) {
  var idx = 0;
  var ilen = a.length;
  var j;
  var jlen = b.length;
  var result = [];
  while (idx < ilen) {
    j = 0;
    while (j < jlen) {
      result[result.length] = [a[idx], b[j]];
      j += 1;
    }
    idx += 1;
  }
  return result;
});
var xprod_default = xprod;

// node_modules/ramda/es/zip.js
var zip = /* @__PURE__ */ _curry2(function zip2(a, b) {
  var rv = [];
  var idx = 0;
  var len = Math.min(a.length, b.length);
  while (idx < len) {
    rv[idx] = [a[idx], b[idx]];
    idx += 1;
  }
  return rv;
});
var zip_default = zip;

// node_modules/ramda/es/zipObj.js
var zipObj = /* @__PURE__ */ _curry2(function zipObj2(keys6, values4) {
  var idx = 0;
  var len = Math.min(keys6.length, values4.length);
  var out = {};
  while (idx < len) {
    out[keys6[idx]] = values4[idx];
    idx += 1;
  }
  return out;
});
var zipObj_default = zipObj;

// node_modules/ramda/es/zipWith.js
var zipWith = /* @__PURE__ */ _curry3(function zipWith2(fn, a, b) {
  var rv = [];
  var idx = 0;
  var len = Math.min(a.length, b.length);
  while (idx < len) {
    rv[idx] = fn(a[idx], b[idx]);
    idx += 1;
  }
  return rv;
});
var zipWith_default = zipWith;

// node_modules/ramda/es/thunkify.js
var thunkify = /* @__PURE__ */ _curry1(function thunkify2(fn) {
  return curryN_default(fn.length, function createThunk() {
    var fnArgs = arguments;
    return function invokeThunk() {
      return fn.apply(this, fnArgs);
    };
  });
});
var thunkify_default = thunkify;

// node_modules/fpjson-lang/dist/esm/index.js
var _ = { Object, Array, String, Number, Boolean };
var c = (t) => typeof t == "function";
var n = (t, s = {}) => {
  if (isNil_default(t))
    return t;
  let u = curry_default((l) => (/^\$/.test(l) && (l = a(tail_default(l), true)), path_default(l.split("."))(s))), a = curry_default((l, o3) => u(l)), p = curry_default((l, o3) => {
    let R = s;
    /^\$/.test(l) && (l = a(tail_default(l), true));
    let y = l.split(".");
    for (let r of init_default(y))
      isNil_default(R[r]) && (R[r] = {}), R = R[r];
    return R[last_default(y)] = o3, o3;
  }), i = null;
  if (c(t[0])) {
    let l = tail_default(t);
    i = t[0](...l);
  } else
    is_default(Array)(t) && t.length === 1 && t[0] === "__" ? i = __default : t[0] === "typ" ? i = _[t[1]] : t[0] === "reg" ? i = new RegExp(...tail_default(t)) : is_default(Array)(t) && (includes_default(t[0])(["let", "var", "$"]) || c(es_exports[t[0]])) ? (i = compose(ifElse_default(o_default(gt_default(__default, 0), length_default), apply_default(t[0] === "$" ? u : t[0] === "var" ? a : t[0] === "let" ? p : es_exports[t[0]]), always_default(es_exports[t[0]])), map_default((l) => n(l, s)), tail_default)(t), i = typeof i > "u" ? [] : i) : is_default(Object)(t) && is_default(String)(t.var) ? i = path_default(t.var.split("."))(s) : is_default(Array)(t) || is_default(Object)(t) ? i = map_default((l) => n(l, s))(t) : i = t;
  let f = null;
  return is_default(Array)(i) && is_default(String)(i[0]) && i[0] === "[]" ? f = tail_default(i) : f = c(i[0]) ? n(i, s) : i, f;
};
var g = n;

// contracts/common/lib/utils.js
var import_json_logic_js = __toESM(require_logic());
var import_jsonschema = __toESM(require_jsonschema());
var clone3 = (state) => JSON.parse(JSON.stringify(state));
var err = (msg = `The wrong query`, contractErr = false) => {
  if (contractErr) {
    const error = typeof ContractError === "undefined" ? Error : ContractError;
    throw new error(msg);
  } else {
    throw msg;
  }
};
var mergeData = (_data, new_data, overwrite = false, signer) => {
  if (isNil_default(_data.__data) || overwrite)
    _data.__data = {};
  for (let k in new_data) {
    const d = new_data[k];
    if (is_default(Object)(d) && d.__op === "arrayUnion") {
      if (complement_default(is_default)(Array, d.arr))
        err();
      if (complement_default(is_default)(Array, _data.__data[k]))
        _data.__data[k] = [];
      _data.__data[k] = concat_default(_data.__data[k], d.arr);
    } else if (is_default(Object)(d) && d.__op === "arrayRemove") {
      if (complement_default(is_default)(Array, d.arr))
        err();
      if (complement_default(is_default)(Array, _data.__data[k]))
        _data.__data[k] = [];
      _data.__data[k] = without_default(d.arr, _data.__data[k]);
    } else if (is_default(Object)(d) && d.__op === "inc") {
      if (isNaN(d.n))
        err();
      if (isNil_default(_data.__data[k]))
        _data.__data[k] = 0;
      _data.__data[k] += d.n;
    } else if (is_default(Object)(d) && d.__op === "del") {
      delete _data.__data[k];
    } else if (is_default(Object)(d) && d.__op === "ts") {
      _data.__data[k] = SmartWeave.block.timestamp;
    } else if (is_default(Object)(d) && d.__op === "signer") {
      _data.__data[k] = signer;
    } else {
      _data.__data[k] = d;
    }
  }
  return _data;
};
var getDoc = (data, path3, _signer, func, new_data, secure = false, relayer, jobID, extra) => {
  const [_col, id] = path3;
  data[_col] ||= { __docs: {} };
  const col = data[_col];
  const { rules, schema } = col;
  col.__docs[id] ||= { __data: null, subs: {} };
  const doc = col.__docs[id];
  if (!isNil_default(_signer) && isNil_default(doc.setter))
    doc.setter = _signer;
  let next_data = null;
  if (path3.length === 2) {
    if (includes_default(func)(["set", "add"])) {
      next_data = mergeData(clone3(doc), new_data, true, _signer).__data;
    } else if (includes_default(func)(["update", "upsert"])) {
      next_data = mergeData(clone3(doc), new_data, false, _signer).__data;
    }
  }
  if (includes_default(func)(["set", "add", "update", "upsert", "delete"]) && (secure || !isNil_default(rules))) {
    let op = func;
    if (includes_default(op)(["set", "add"]))
      op = "create";
    if (op === "create" && !isNil_default(doc.__data))
    op = "update";
    if (op === "upsert") {
      if (!isNil_default(doc.__data)) {
        op = "update";
      } else {
        op = "create";
      }
    }
    let allowed = false;
    let rule_data = {
      request: {
        method: op,
        auth: { signer: _signer, relayer, jobID, extra },
        block: {
          height: SmartWeave.block.height,
          timestamp: SmartWeave.block.timestamp
        },
        transaction: {
          id: SmartWeave.transaction.id
        },
        resource: { data: new_data },
        id: last_default(path3),
        path: path3
      },
      resource: {
        data: doc.__data,
        setter: doc.setter,
        newData: next_data,
        id: last_default(path3),
        path: path3
      }
    };
    const setElm = (k, val) => {
      let elm = rule_data;
      let elm_path = k.split(".");
      let i = 0;
      for (let v of elm_path) {
        if (i === elm_path.length - 1) {
          elm[v] = val;
          break;
        } else if (isNil_default(elm[v]))
          elm[v] = {};
        elm = elm[v];
        i++;
      }
      return elm;
    };
    if (!isNil_default(rules)) {
      for (let k in rules || {}) {
        const [permission, _ops] = k.split(" ");
        if (permission !== "let")
        continue;
        const rule = rules[k];
        let ok = false;
        if (isNil_default(_ops)) {
          ok = true;
        } else {
          const ops = _ops.split(",");
          if (intersection_default(ops)(["write", op]).length > 0) {
            ok = true;
          }
        }
        if (ok) {
          for (let k2 in rule || {}) {
            setElm(k2, g(clone3(rule[k2]), rule_data));
          }
        }
      }
    }
    for (let k in rules || {}) {
      const spk = k.split(" ");
      if (spk[0] === "let")
      continue;
      const rule = rules[k];
      const [permission, _ops] = k.split(" ");
      const ops = _ops.split(",");
      if (intersection_default(ops)(["write", op]).length > 0) {
        const ok = import_json_logic_js.default.apply(rule, rule_data);
        if (permission === "allow" && ok) {
          allowed = true;
        } else if (permission === "deny" && ok)
        err();
      }
    }
    if (!allowed)
      err("operation not allowed");
  }
  return path3.length >= 4 ? getDoc(
    doc.subs,
    slice_default(2, path3.length, path3),
    _signer,
    func,
    new_data,
    secure,
    relayer,
    jobID,
    extra
  ) : {
    doc,
    schema,
    rules,
    col,
    next_data
  };
};
var getCol = (data, path3, _signer) => {
  const [col, id] = path3;
  data[col] ||= { __docs: {} };
  if (isNil_default(id)) {
    return data[col];
  } else {
    data[col].__docs[id] ||= { __data: null, subs: {} };
    if (!isNil_default(_signer) && isNil_default(data[col].__docs[id].setter)) {
      data[col].__docs[id].setter = _signer;
    }
    return getCol(
      data[col].__docs[id].subs,
      slice_default(2, path3.length, path3),
      _signer
    );
  }
};
var validateSchema = (schema, data, contractErr) => {
  if (!isNil_default(schema)) {
    const valid = (0, import_jsonschema.validate)(data, clone3(schema)).valid;
    if (!valid)
      err(null, contractErr);
  }
};
function bigIntFromBytes(byteArr) {
  let hexString = "";
  for (const byte of byteArr) {
    hexString += byte.toString(16).padStart(2, "0");
  }
  return BigInt("0x" + hexString);
}
async function getRandomIntNumber(max3, action, uniqueValue = "", salt) {
  const pseudoRandomData = SmartWeave.arweave.utils.stringToBuffer(
    SmartWeave.block.height + SmartWeave.block.timestamp + SmartWeave.transaction.id + action.caller + uniqueValue + salt.toString()
  );
  const hashBytes = await SmartWeave.arweave.crypto.hash(pseudoRandomData);
  const randomBigInt = bigIntFromBytes(hashBytes);
  return Number(randomBigInt % BigInt(max3));
}
var genId = async (action, salt) => {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let autoId = "";
  for (let i = 0; i < 20; i++) {
    autoId += CHARS.charAt(
      await getRandomIntNumber(CHARS.length, action, i, salt) - 1
    );
  }
  return autoId;
};
var parse = async (state, action, func, signer, salt, contractErr = true) => {
  const { data } = state;
  const { query } = action.input;
  const { relayer, jobID, extra } = action;
  let new_data = null;
  let path3 = null;
  let col;
  if (includes_default(func)([
    "delete",
    "getSchema",
    "getRules",
    "getAlgorithms",
    "removeRelayerJob",
    "getRelayerJob",
    "listCollections"
  ])) {
    path3 = query;
  } else {
    ;
    [new_data, ...path3] = query;
    if (func === "add") {
      const id = await genId(action, salt);
      if (isNil_default(state.ids[SmartWeave.transaction.id])) {
        state.ids[SmartWeave.transaction.id] = [];
      }
      state.ids[SmartWeave.transaction.id].push(id);
      path3.push(id);
    }
  }
  if (isNil_default(new_data) && !includes_default(func)([
    "listCollections",
    "delete",
    "getSchema",
    "getRules",
    "getAlgorithms",
    "getRelayerJob",
    "removeRelayerJob",
    "getRelayerJob"
  ]) || path3.length === 0 && !includes_default(func)(["setAlgorithms", "listCollections"]) || path3.length % 2 !== 0 && !includes_default(func)([
    "addRelayerJob",
    "removeRelayerJob",
    "getRelayerJob",
    "addIndex",
    "removeIndex",
    "setSchema",
    "getSchema",
    "getAlgorithms",
    "setRules",
    "getRules",
    "linkContract",
    "unlinkContract"
  ])) {
    err(`the wrong query length[${query.length}] for ${func}`, contractErr);
  }
  let _data = null;
  let schema = null;
  let rules = null;
  let next_data;
  if (includes_default(func)([
    "addIndex",
    "removeIndex",
    "setSchema",
    "getSchema",
    "setRules",
    "getRules"
  ])) {
    _data = getCol(data, path3, signer, func);
    col = _data;
  } else if (!includes_default(func)([
    "setAlgorithms",
    "addRelayerJob",
    "removeRelayerJob",
    "getAlgorithms",
    "linkContract",
    "unlinkContract"
  ]) && path3.length !== 0) {
    const doc = getDoc(
      data,
      path3,
      signer,
      func,
      new_data,
      state.secure,
      relayer,
      jobID,
      extra
    );
    _data = doc.doc;
    ({ next_data, schema, rules, col } = doc);
  }
  let owner = state.owner || [];
  if (is_default(String)(owner))
    owner = of_default(owner);
  if (includes_default(func)([
    "addRelayerJob",
    "removeRelayerJob",
    "addIndex",
    "removeIndex",
    "setSchema",
    "setAlgorithms",
    "setRules",
    "unlinkContract",
    "linkContract",
    "unlinkContract"
  ]) && !includes_default(signer)(owner)) {
    err("caller is not contract owner", contractErr);
  }
  return { data, query, new_data, path: path3, _data, schema, col, next_data };
};
var isOwner = (signer, state) => {
  let owner = state.owner || [];
  if (is_default(String)(owner))
    owner = of_default(owner);
  if (!includes_default(signer)(owner)) {
    err(`Signer[${signer}] is not the owner[${owner.join(", ")}].`);
  }
  return owner;
};
var read = async (contract, param) => {
  return (await SmartWeave.contracts.viewContractState(contract, param)).result;
};
var isEvolving = (state) => !isNil_default(state.evolveHistory) && !isNil_default(last_default(state.evolveHistory)) && isNil_default(last_default(state.evolveHistory).newVersion);

// contracts/common/actions/read/nonce.js
var nonce = async (state, action) => {
  const { nonces } = state;
  let { address } = action.input;
  if (isNil_default(address))
    err(`No Address`);
  if (/^0x/.test(address))
    address = address.toLowerCase();
  return { result: nonces[address] || 0 };
};

// contracts/common/actions/read/ids.js
var ids = async (state, action) => {
  const { ids: ids2 } = state;
  const { tx } = action.input;
  return { result: ids2[tx] || null };
};

// contracts/common/lib/index.js
var {
  intersection: intersection3,
  uniq: uniq2,
  concat: concat3,
  pluck: pluck3,
  indexOf: indexOf3,
  slice: slice3,
  findIndex: findIndex3,
  append: append3,
  clone: clone4,
  keys: keys4,
  reverse: reverse3,
  map: map3,
  isNil: isNil3,
  range: range3,
  values: values3,
  descend: descend3,
  ascend: ascend3,
  compose: compose2,
  prop: prop3,
  hasPath: hasPath3,
  filter: filter2,
  none: none3,
  difference: difference3,
  equals: equals3
} = require_src();
var comp = (val, x) => {
  let res = 0;
  for (let i of range3(0, val.length)) {
    let a = val[i].val;
    let b = x[i];
    if (val[i].desc) {
      a = x[i];
      b = val[i].val;
    }
    if (a > b) {
      res = -1;
      break;
    } else if (a < b) {
      res = 1;
      break;
    }
  }
  return res;
};
var bsearch = function(arr, x, k, db, start = 0, end = arr.length - 1) {
  if (start > end)
    return null;
  const mid = Math.floor((start + end) / 2);
  const val = isNil3(k) ? arr[mid] : db[arr[mid]].__data[k];
  if (val === x)
    return mid;
  if (val > x && mid === 0)
    return 0;
  if (mid !== 0 && val > x && (isNil3(k) ? arr[mid - 1] : db[arr[mid - 1]].__data[k]) <= x) {
    return mid;
  }
  if (val > x) {
    return bsearch(arr, x, k, db, start, mid - 1);
  } else {
    return bsearch(arr, x, k, db, mid + 1, end);
  }
};
var addSingleIndex = (_id, k, data, ind, db) => {
  if (!isNil3(k) && isNil3(ind[k])) {
    ind[k] = { asc: { _: [], subs: {} } };
  }
  const _k = k || "__id__";
  const _data = isNil3(k) ? _id : data[k];
  let indexes = ind[_k].asc._;
  const _ind = bsearch(indexes, _data, k, db);
  if (isNil3(_ind))
    indexes.push(_id);
  else
    ind[_k].asc._.splice(_ind, 0, _id);
};
var removeSingleIndex = (_id, k, ind) => {
  const _k = k || "__id__";
  let indexes = ind[_k].asc._;
  const _ind = indexOf3(_id, indexes);
  if (!isNil3(_ind))
    ind[_k].asc._.splice(_ind, 1);
};
var bsearch2 = function(arr, x, sort3, db, start = 0, end = arr.length - 1) {
  if (start > end)
    return null;
  let mid = Math.floor((start + end) / 2);
  const val = map3((v) => ({
    desc: v[1] === "desc",
    val: db[arr[mid]].__data[v[0]]
  }))(sort3);
  const res = comp(val, x);
  if (res === 0)
    return mid;
  if (res === -1 && mid === 0)
    return 0;
  if (mid > 0) {
    const val2 = map3((v) => ({
      desc: v[1] === "desc",
      val: db[arr[mid - 1]].__data[v[0]]
    }))(sort3);
    const res2 = comp(val2, x);
    if (res === -1 && res2 >= 0)
      return mid;
  }
  if (res === -1) {
    return bsearch2(arr, x, sort3, db, start, mid - 1);
  } else {
    return bsearch2(arr, x, sort3, db, mid + 1, end);
  }
};
var addInd = (_id, index, db, sort3, data) => {
  const x = map3((v) => data[v[0]])(sort3);
  const _ind = bsearch2(index._, x, sort3, db);
  if (isNil3(_ind))
    index._.push(_id);
  else
    index._.splice(_ind, 0, _id);
};
var removeInd = (_id, index) => {
  const _ind = indexOf3(_id, index._);
  if (!isNil3(_ind))
    index._.splice(_ind, 1);
};
var _addData = (ind, _id, path3 = [], db, data, top = false) => {
  for (let k in ind) {
    if (k === "__id__")
    continue;
    for (let k2 in ind[k]) {
      if (!isNil3(ind[k][k2]._) && !top) {
        let sort3 = append3([k, k2])(path3);
        const fields = map3(prop3(0), sort3);
        if (difference3(fields, keys4(data)).length === 0) {
          addInd(_id, ind[k][k2], db, sort3, data);
        }
      }
      _addData(
        ind[k][k2].subs,
        _id,
        compose2(append3([k, k2]), clone4)(path3),
        db,
        data
      );
    }
  }
};
var getIndex = (state, path3) => {
  if (isNil3(state.indexes[path3.join(".")]))
  state.indexes[path3.join(".")] = {};
  return state.indexes[path3.join(".")];
};
var addData = (_id, data, ind, db) => {
  if (isNil3(ind["__id__"])) {
    ind["__id__"] = { asc: { _: [_id], subs: {} } };
  } else {
    addSingleIndex(_id, null, data, ind, db);
  }
  for (let k in data) {
    if (k === "__id__")
    continue;
    if (isNil3(ind[k])) {
      ind[k] = { asc: { _: [_id], subs: {} } };
    } else {
      addSingleIndex(_id, k, data, ind, db);
    }
  }
  _addData(ind, _id, [], db, data, true);
};
var _updateData = (ind, _id, path3 = [], db, top = false, update4, new_data, old_data) => {
  for (let k in ind) {
    if (k === "__id__")
    continue;
    for (let k2 in ind[k]) {
      if (!isNil3(ind[k][k2]._) && !top) {
        let sort3 = append3([k, k2])(path3);
        const fields = map3(prop3(0), sort3);
        let ex_old = false;
        let ex_new = false;
        if (difference3(fields, keys4(old_data)).length === 0)
          ex_old = true;
        if (difference3(fields, keys4(new_data)).length === 0)
          ex_new = true;
        if (ex_old && !ex_new) {
          removeInd(_id, ind[k][k2]);
        } else if (!ex_old && ex_new) {
          addInd(_id, ind[k][k2], sort3, new_data);
        } else if (intersection3(update4.u, fields).length !== 0) {
          removeInd(_id, ind[k][k2]);
          addInd(_id, ind[k][k2], sort3, new_data);
        }
      }
      _updateData(
        ind[k][k2].subs,
        _id,
        compose2(append3([k, k2]), clone4)(path3),
        db,
        false,
        update4,
        new_data,
        old_data
      );
    }
  }
};
var updateData = (_id, data, old_data, ind, db) => {
  if (isNil3(old_data))
    return;
  const _keys = compose2(uniq2, concat3(keys4(old_data)), keys4)(data);
  let c2 = [];
  let d = [];
  let u = [];
  for (let v of _keys) {
    if (v === "__id__")
    continue;
    if (isNil3(data[v])) {
      d.push(v);
      removeSingleIndex(_id, v, ind);
    } else if (isNil3(old_data[v])) {
      c2.push(v);
      addSingleIndex(_id, v, data, ind, db);
    } else if (!equals3(data[v], old_data[v])) {
      u.push(v);
      removeSingleIndex(_id, v, ind);
      addSingleIndex(_id, v, data, ind, db);
    }
  }
  _updateData(ind, _id, [], true, { c: c2, d, u }, data, old_data);
};
var _removeData = (ind, _id, path3 = [], db, top = false) => {
  for (let k in ind) {
    if (k === "__id__")
    continue;
    for (let k2 in ind[k]) {
      if (!isNil3(ind[k][k2]._) && !top) {
        let sort3 = append3([k, k2])(path3);
        const fields = map3(prop3(0), sort3);
        if (difference3(fields, keys4(db[_id].__data)).length === 0) {
          removeInd(_id, ind[k][k2]);
        }
      }
      _removeData(
        ind[k][k2].subs,
        _id,
        compose2(append3([k, k2]), clone4)(path3),
        db
      );
    }
  }
};
var _sort = (sort3, ind, db) => {
  const fields = map3(prop3(0), sort3);
  for (let id in db) {
    if (difference3(fields, keys4(db[id].__data)).length === 0) {
      const x = map3((v) => db[id].__data[v[0]])(sort3);
      const _ind = bsearch2(ind, x, sort3, db);
      if (isNil3(_ind))
        ind.push(id);
      else
        ind.splice(_ind, 0, id);
    }
  }
  return ind;
};
var removeData = (_id, ind, db) => {
  if (isNil3(db[_id]))
    return;
  if (!isNil3(ind["__id__"])) {
    removeSingleIndex(_id, null, ind);
  }
  let data = db[_id];
  for (let k in db[_id].__data) {
    if (!isNil3(ind[k]))
      removeSingleIndex(_id, k, ind);
  }
  _removeData(ind, _id, [], db, true);
  delete db[_id];
};
var _getIndex = (sort3, ind) => {
  if (sort3.length <= 1)
    return { index: null, ex: false };
  let _ind = ind;
  let i = 0;
  let ex = true;
  for (let v of sort3) {
    let subs = i === 0 ? _ind : _ind.subs;
    if (!hasPath3([v[0]])(subs)) {
      subs[v[0]] = {};
    }
    if (!hasPath3([v[0], v[1] || "asc", "_"])(subs)) {
      if (i === sort3.length - 1)
        ex = false;
      subs[v[0]][v[1] || "asc"] = { subs: {} };
    }
    _ind = subs[v[0]][v[1] || "asc"];
    i++;
  }
  return { index: _ind, ex };
};
var addIndex3 = (sort3, ind, db) => {
  let { index: _ind, ex } = _getIndex(sort3, ind);
  if (isNil3(_ind._))
    _ind._ = [];
  if (!ex)
    _ind._ = _sort(sort3, _ind._, db);
};
var removeIndex = (sort3, ind, db) => {
  let { index: _ind, ex } = _getIndex(sort3, ind);
  delete _ind._;
};

// contracts/common/actions/read/get.js
var parseQuery = (query) => {
  const [path3, opt] = splitWhen_default(complement_default(is_default)(String), query);
  let _limit = null;
  let _filter2 = null;
  let _sort2 = null;
  let _startAt = null;
  let _startAfter = null;
  let _endAt = null;
  let _endBefore = null;
  for (const v of opt) {
    if (is_default(Number)(v)) {
      if (isNil_default(_limit)) {
        _limit = v;
      } else {
        err();
      }
    } else if (is_default(Array)(v)) {
      if (v.length === 0)
        err();
      if (v[0] === "startAt") {
        if (isNil_default(_startAt) && v.length > 1 && v.length > 1) {
          _startAt = v;
        } else {
          err();
        }
      } else if (v[0] === "startAfter") {
        if (isNil_default(_startAfter) && v.length > 1 && v.length > 1) {
          _startAfter = v;
        } else {
          err();
        }
      } else if (v[0] === "endAt") {
        if (isNil_default(_endAt) && v.length > 1 && v.length > 1) {
          _endAt = v;
        } else {
          err();
        }
      } else if (v[0] === "endBefore") {
        if (isNil_default(_endBefore) && v.length > 1 && v.length > 1) {
          _endBefore = v;
        } else {
          err();
        }
      } else if (v.length === 3) {
        if (includes_default(v[1])([
          ">",
          "=",
          "!=",
          "<",
          ">=",
          "<=",
          "in",
          "not-in",
          "array-contains",
          "array-contains-any"
        ])) {
          if (isNil_default(_filter2)) {
            _filter2 = {};
          }
          if (!isNil_default(_filter2[v[1]]))
            err();
          _filter2[v[1]] = v;
        } else {
          err();
        }
      } else if (v.length === 2) {
        if (includes_default(v[1])(["asc", "desc"])) {
          if (isNil_default(_sort2)) {
            _sort2 = [v];
          } else {
            _sort2.push(v);
          }
        } else {
          err();
        }
      } else if (v.length === 1) {
        if (isNil_default(_sort2)) {
          _sort2 = [append_default("asc", v)];
        } else {
          _sort2.push(append_default("asc", v));
        }
      } else {
        err();
      }
    }
  }
  const checkSkip = (a, b) => {
    if (!isNil_default(a) || !isNil_default(b)) {
      if (!isNil_default(a) && !isNil_default(b))
        err();
      if ((a || b).length < (_sort2 || []).length)
        err();
    }
  };
  if (isNil_default(path3) || path3.length === 0)
    err();
  checkSkip(_startAt, _startAfter);
  checkSkip(_endAt, _endBefore);
  return {
    path: path3,
    _limit,
    _filter: _filter2,
    _sort: _sort2,
    _startAt,
    _startAfter,
    _endAt,
    _endBefore
  };
};
var getColIndex = (state, data, path3, _sort2) => {
  let index = [];
  let ind = getIndex(state, path3);
  if (!isNil_default(_sort2)) {
    let i = 0;
    let _ind = ind;
    for (let v of _sort2) {
      let subs = i === 0 ? _ind : _ind.subs;
      if (isNil_default(subs[v[0]])) {
        if (i === 0)
          break;
        err();
      }
      _ind = subs[v[0]][_sort2.length === 1 ? "asc" : v[1] || "asc"];
      i++;
    }
    index = _ind._ || [];
    if (_sort2.length === 1 && _sort2[0][1] === "desc")
    index = reverse_default(index);
  } else {
    index = !isNil_default(ind.__id__) ? ind.__id__.asc._ : keys_default(getCol(data, path3).__docs);
  }
  return index;
};
var comp2 = (val, x) => {
  let res = 0;
  for (let i of range_default(0, val.length)) {
    let a = val[i].val;
    let b = x[i];
    if (val[i].desc) {
      a = x[i];
      b = val[i].val;
    }
    if (a > b) {
      res = -1;
      break;
    } else if (a < b) {
      res = 1;
      break;
    }
  }
  return res;
};
var bsearch3 = function(arr, x, sort3, db, start = 0, end = arr.length - 1) {
  if (start > end)
    return null;
  let mid = Math.floor((start + end) / 2);
  const val = addIndex_default(map_default)((v, i) => ({
    desc: sort3[i][1] === "desc",
    val: db[arr[mid]].__data[sort3[i][0]]
  }))(tail_default(x));
  let res = comp2(val, tail_default(x));
  let res2 = 1;
  if (includes_default(x[0])(["startAt", "startAfter"])) {
    if (mid > 0) {
      const val2 = addIndex_default(map_default)((v, i) => ({
        desc: sort3[i][1] === "desc",
        val: db[arr[mid - 1]].__data[sort3[i][0]]
      }))(tail_default(x));
      res2 = comp2(val2, tail_default(x));
    }
  } else {
    if (mid < arr.length - 1) {
      const val2 = addIndex_default(map_default)((v, i) => ({
        desc: sort3[i][1] === "desc",
        val: db[arr[mid + 1]].__data[sort3[i][0]]
      }))(tail_default(x));
      res2 = comp2(val2, tail_default(x));
    }
  }
  let down = false;
  switch (x[0]) {
    case "startAt":
      if (res2 === 1 && res <= 0)
        return mid;
      if (res <= 0)
        down = true;
      break;
    case "startAfter":
      if (res2 >= 0 && res === -1)
        return mid;
      if (res < 0)
        down = true;
      break;
    case "endAt":
      if (res2 === -1 && res >= 0)
        return mid;
      if (res < 0)
        down = true;
      break;
    case "endBefore":
      if (res2 <= 0 && res === 1)
        return mid;
      if (res <= 0)
        down = true;
      break;
  }
  if (down) {
    return bsearch3(arr, x, sort3, db, start, mid - 1);
  } else {
    return bsearch3(arr, x, sort3, db, mid + 1, end);
  }
};
var get = async (state, action, cursor = false) => {
  const {
    path: path3,
    _limit,
    _filter: _filter2,
    _sort: _sort2,
    _startAt,
    _endAt,
    _startAfter,
    _endBefore
  } = parseQuery(action.input.query);
  const { data } = state;
  if (path3.length % 2 === 0) {
    if (any_default(complement_default(isNil_default))([_limit, _sort2, _filter2]))
      err();
    const { doc: _data } = getDoc(data, path3);
    return {
      result: isNil_default(_data.__data) ? null : cursor ? {
        id: last_default(path3),
        setter: _data.setter,
        data: _data.__data || null,
        block: {
          height: SmartWeave.block.height,
          timestamp: SmartWeave.block.timestamp
        }
      } : _data.__data || null
    };
  } else {
    let index = getColIndex(state, data, path3, _sort2);
    if (isNil_default(index))
      err("index doesn't exist");
    const { doc: _data } = path3.length === 1 ? { doc: data } : getDoc(data, slice_default(0, -1, path3));
    const docs = (path3.length === 1 ? _data : _data.subs)[last_default(path3)]?.__docs || {};
    let _docs = [];
    let start = null;
    let end = null;
    let _start = _startAt || _startAfter;
    let _end = _endAt || _endBefore;
    if (!isNil_default(_start)) {
      if (is_default(Object)(_start[1]) && hasPath_default([1, "id"])(_start)) {
        start = bsearch3(
          index,
          [
            "startAt",
            map_default(
              (v) => v[0] === "__id__" ? _start[1].id : docs[_start[1].id].__data[v[0]]
        )(_sort2 || [["__id__"]])
      ],
        _sort2 || [["__id__"]],
          docs
      );
        for (let i = start; i < index.length; i++) {
          if (index[i] === _start[1].id) {
            start = i;
            break;
          }
        }
        if (!isNil_default(start)) {
          if (_start[0] === "startAfter")
          start += 1;
          index.splice(0, start);
        }
      } else {
        start = bsearch3(index, _start, _sort2 || [["__id__"]], docs);
        index.splice(0, start);
      }
    }
    if (!isNil_default(_end)) {
      if (!isNil_default(_start)) {
        const len = Math.min(_end.length, _start.length) - 1;
        const val = take_default(
          len,
          addIndex_default(map_default)((v, i) => ({
            desc: _sort2[i][1] === "desc",
            val: v
          }))(tail_default(_start))
        );
        if (comp2(val, tail_default(_end)) === -1)
          err();
      }
      if (is_default(Object)(_end[1]) && hasPath_default([1, "id"])(_end)) {
        end = bsearch3(
          index,
          [
            "startAt",
            map_default(
              (v) => v[0] === "__id__" ? _end[1].id : docs[_end[1].id].__data[v[0]]
        )(_sort2 || [["__id__"]])
      ],
        _sort2 || [["__id__"]],
          docs
      );
        for (let i = end; i < index.length; i++) {
          if (index[i] === _end[1].id) {
            end = i;
            break;
          }
        }
        if (!isNil_default(end)) {
          if (_end[0] === "endBefore" && end !== 0)
          end -= 1;
          index.splice(end + 1, index.length - end);
        }
      } else {
        end = bsearch3(index, _end, _sort2 || [["__id__"]], docs);
        index.splice(end + 1, index.length - end);
      }
    }
    let res = index;
    if (!isNil_default(_filter2)) {
      res = [];
      const sort_field = compose(
        uniq_default,
        pluck_default(0),
        filter_default((v) => includes_default(v[1])([">", ">=", "<", "<=", "!=", "not-in"])),
        values_default
      )(_filter2);
      if (sort_field.length > 1) {
        err();
      }
      if (sort_field.length === 1 && (isNil_default(_sort2) || _sort2[0][0] !== sort_field[0])) {
        err();
      }
      for (let _v of index) {
        const v = docs[_v].__data;
        let ok = true;
        for (let v2 of values_default(_filter2)) {
          if (isNil_default(v[v2[0]]) && v[v2[0]] !== null) {
            ok = false;
          }
          switch (v2[1]) {
            case ">":
              ok = v[v2[0]] > v2[2];
              break;
            case "<":
              ok = v[v2[0]] < v2[2];
              break;
            case ">=":
              ok = v[v2[0]] >= v2[2];
              break;
            case "<=":
              ok = v[v2[0]] <= v2[2];
              break;
            case "=":
              ok = v[v2[0]] === v2[2];
              break;
            case "!=":
              ok = v[v2[0]] !== v2[2];
              break;
            case "in":
              ok = includes_default(v[v2[0]])(v2[2]);
              break;
            case "not-in":
              ok = !includes_default(v[v2[0]])(v2[2]);
              break;
            case "array-contains":
              ok = is_default(Array, v[v2[0]]) && includes_default(v2[2])(v[v2[0]]);
              break;
            case "array-contains-any":
              ok = is_default(Array, v[v2[0]]) && intersection_default(v2[2])(v[v2[0]]).length > 0;
              break;
          }
          if (!ok)
            break;
        }
        if (ok) {
          res.push(_v);
          if (!isNil_default(_limit) && res.length >= _limit)
            break;
        }
      }
    }
    return {
      result: compose(
        when_default(o_default(complement_default(isNil_default), always_default(_limit)), take_default(_limit)),
        map_default(
          (v) => cursor ? {
            id: v,
            setter: docs[v].setter,
            data: docs[v].__data,
            block: {
              height: SmartWeave.block.height,
              timestamp: SmartWeave.block.timestamp
            }
          } : docs[v].__data
        )
      )(res)
    };
  }
};

// contracts/common/actions/read/getSchema.js
var getSchema = async (state, action) => {
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "getSchema"
);
  return { result: _data.schema || null };
};

// contracts/common/actions/read/getRules.js
var getRules = async (state, action) => {
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "getRules"
);
  return { result: _data.rules || null };
};

// contracts/common/actions/read/getIndexes.js
var scanIndexes = (ind) => {
  let indexes = [];
  for (let k in ind) {
    for (let k2 in ind[k]) {
      const _ind = [[k, k2]];
      if (!isNil_default(ind[k][k2]._))
        indexes.push(_ind);
      if (!isNil_default(ind[k][k2].subs)) {
        const sub_indexes = scanIndexes(ind[k][k2].subs);
        for (let v of sub_indexes) {
          indexes.push([..._ind, ...v]);
        }
      }
    }
  }
  return indexes;
};
var getIndexes = async (state, action) => {
  const path3 = action.input.query;
  if (path3.length % 2 === 0)
    err();
  const index = getIndex(state, path3);
  return {
    result: scanIndexes(index)
  };
};

// contracts/common/actions/read/getCrons.js
var getCrons = async (state, action) => {
  if (isNil_default(state.crons)) {
    state.crons = { lastExecuted: SmartWeave.block.timestamp, crons: {} };
  }
  return {
    result: state.crons
  };
};

// contracts/common/actions/read/getAlgorithms.js
var getAlgorithms = async (state, action) => {
  if (isNil_default(state.auth.algorithms)) {
    state.auth.algorithms = ["secp256k1", "ed25519", "rsa256", "poseidon"];
  }
  return {
    result: state.auth.algorithms
  };
};

// contracts/common/actions/read/getLinkedContract.js
var getLinkedContract = async (state, action) => {
  const contracts = state.contracts || {};
  return {
    result: contracts[action.input.query[0]] || null
  };
};

// contracts/common/actions/read/getOwner.js
var { is: is3, of: of2 } = require_src();
var getOwner = async (state, action) => {
  let owner = state.owner || [];
  if (is3(String)(owner))
    owner = of2(owner);
  return {
    result: owner
  };
};

// contracts/common/actions/read/getAddressLink.js
var getAddressLink = async (state, action) => {
  const { address } = action.input.query;
  const link = state.auth.links[address.toLowerCase()];
  if (isNil_default(link))
    return { result: null };
  let _address = is_default(Object, link) ? link.address : link;
  let _expiry = is_default(Object, link) ? link.expiry || 0 : 0;
  return {
    result: { address: _address, expiry: _expiry }
  };
};

// contracts/common/actions/read/getRelayerJob.js
var getRelayerJob = async (state, action) => {
  const jobs = state.relayers || {};
  return {
    result: jobs[action.input.query[0]] || null
  };
};

// contracts/common/actions/read/listRelayerJobs.js
var { keys: keys5 } = require_src();
var listRelayerJobs = async (state, action) => {
  return {
    result: keys5(state.relayers || {})
  };
};

// contracts/common/actions/read/getEvolve.js
var getEvolve = async (state, action) => {
  let evolve4 = pickAll_default(["canEvolve", "evolve"])(state);
  evolve4.history = state.evolveHistory || [];
  evolve4.isEvolving = isEvolving(state);
  return {
    result: evolve4
  };
};

// contracts/common/actions/read/listCollections.js
var listCollections = async (state, action) => {
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "listCollections"
);
  return {
    result: keys_default(path3.length === 0 ? data : _data.subs)
  };
};

// contracts/common/actions/read/getInfo.js
var { pick: pick3 } = require_src();
var version = require_version();
var getInfo = async (state, action) => {
  let info = pick3(
    [
      "auth",
      "canEvolve",
      "contracts",
      "evolve",
      "secure",
      "version",
      "owner",
      "contracts"
    ],
    state
  );
  delete info.auth.links;
  info.version = version;
  info.evolveHistory = state.evolveHistory || [];
  info.isEvolving = isEvolving(state);
  return {
    result: info
  };
};

// contracts/common/lib/validate.js
var validate = async (state, action, func) => {
  const {
    query,
    nonce: nonce2,
    signature,
    caller,
    type: type3 = "secp256k1",
    pubKey
  } = action.input;
  if (!includes_default(type3)(
    state.auth.algorithms || ["secp256k1", "secp256k1-2", "ed25519", "rsa256"]
  )) {
    err(`The wrong algorithm`);
  }
  let _caller = caller;
  const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "verifyingContract", type: "string" }
  ];
  const domain = {
    name: state.auth.name,
    version: state.auth.version,
    verifyingContract: isNil_default(SmartWeave.contract) ? "exm" : SmartWeave.contract.id
  };
  const message = {
    nonce: nonce2,
    query: JSON.stringify({ func, query })
  };
  const _data = {
    types: {
      EIP712Domain,
      Query: [
        { name: "query", type: "string" },
        { name: "nonce", type: "uint256" }
      ]
    },
    domain,
    primaryType: "Query",
    message
  };
  let signer = null;
  if (type3 === "ed25519") {
    const { isValid } = await read(state.contracts.dfinity, {
      function: "verify",
      data: _data,
      signature,
      signer: caller
    });
    if (isValid) {
      signer = caller;
    } else {
      err(`The wrong signature`);
    }
  } else if (type3 === "rsa256") {
    let encoded_data = JSON.stringify(_data);
    if (typeof TextEncoder !== "undefined") {
      const enc = new TextEncoder();
      encoded_data = enc.encode(encoded_data);
    }
    const _crypto = SmartWeave.arweave.crypto || SmartWeave.arweave.wallets.crypto;
    const isValid = await _crypto.verify(
      pubKey,
      encoded_data,
      Buffer.from(signature, "hex")
  );
    if (isValid) {
      signer = caller;
    } else {
      err(`The wrong signature`);
    }
  } else if (type3 == "secp256k1") {
    signer = (await read(state.contracts.ethereum, {
      function: "verify712",
      data: _data,
      signature
    })).signer;
  } else if (type3 == "secp256k1-2") {
    signer = (await read(state.contracts.ethereum, {
      function: "verify",
      data: _data,
      signature
    })).signer;
  }
  if (includes_default(type3)(["secp256k1", "secp256k1-2"])) {
    if (/^0x/.test(signer))
      signer = signer.toLowerCase();
    if (/^0x/.test(_caller))
      _caller = _caller.toLowerCase();
  }
  let original_signer = signer;
  let _signer = signer;
  if (_signer !== _caller) {
    const link = state.auth.links[_signer];
    if (!isNil_default(link)) {
      let _address = is_default(Object, link) ? link.address : link;
      let _expiry = is_default(Object, link) ? link.expiry || 0 : 0;
      if (_expiry === 0 || SmartWeave.block.timestamp <= _expiry) {
        _signer = _address;
      }
    }
  }
  if (_signer !== _caller)
    err(`signer[${_signer}] is not caller[${_caller}]`);
  let next_nonce = (state.nonces[original_signer] || 0) + 1;
  if (next_nonce !== nonce2) {
    err(
      `The wrong nonce[${nonce2}] for ${original_signer}: expected ${next_nonce}`
    );
  }
  if (isNil_default(state.nonces[original_signer]))
    state.nonces[original_signer] = 0;
  state.nonces[original_signer] += 1;
  return _signer;
};

// contracts/common/actions/write/add.js
var add3 = async (state, action, signer, salt = 0, contractErr = true) => {
  signer ||= await validate(state, action, "add");
  let { _data, data, query, new_data, path: path3, schema, col, next_data } = await parse(state, action, "add", signer, salt, contractErr);
  if (!isNil_default(_data.__data))
    err("doc already exists");
  validateSchema(schema, next_data, contractErr);
  let ind = getIndex(state, init_default(path3));
  addData(last_default(path3), next_data, ind, col.__docs);
  _data.__data = next_data;
  return { state };
};

// contracts/common/actions/write/set.js
var set3 = async (state, action, signer, contractErr = true) => {
  signer ||= await validate(state, action, "set");
  let { _data, data, query, new_data, path: path3, schema, col, next_data } = await parse(state, action, "set", signer, 0, contractErr);
  let prev = clone_default(_data.__data);
  validateSchema(schema, next_data, contractErr);
  let ind = getIndex(state, init_default(path3));
  if (isNil_default(prev)) {
    addData(last_default(path3), next_data, ind, col.__docs);
  } else {
    updateData(last_default(path3), next_data, prev, ind, col.__docs);
  }
  _data.__data = next_data;
  return { state };
};

// contracts/common/actions/write/update.js
var update3 = async (state, action, signer, contractErr = true) => {
  signer ||= await validate(state, action, "update");
  let {
    data,
    query,
    new_data,
    path: path3,
    _data,
    schema,
    col,
    next_data
  } = await parse(state, action, "update", signer, 0, contractErr);
  if (isNil_default(_data.__data))
    err(`Data doesn't exist`);
  let prev = clone3(_data.__data);
  validateSchema(schema, next_data, contractErr);
  let ind = getIndex(state, init_default(path3));
  updateData(last_default(path3), next_data, prev, ind, col.__docs);
  _data.__data = next_data;
  return { state };
};

// contracts/common/actions/write/upsert.js
var upsert = async (state, action, signer, contractErr = true) => {
  signer ||= await validate(state, action, "upsert");
  let {
    data,
    query,
    _signer,
    new_data,
    path: path3,
    schema,
    _data,
    col,
    next_data
  } = await parse(state, action, "upsert", signer, 0, contractErr);
  let prev = clone3(_data.__data);
  validateSchema(schema, next_data, contractErr);
  let ind = getIndex(state, init_default(path3));
  if (isNil_default(prev)) {
    addData(last_default(path3), next_data, ind, col.__docs);
  } else {
    updateData(last_default(path3), next_data, prev, ind, col.__docs);
  }
  _data.__data = next_data;
  return { state };
};

// contracts/common/actions/write/remove.js
var remove3 = async (state, action, signer, contractErr = true) => {
  signer ||= await validate(state, action, "delete");
  const { data, query, new_data, path: path3, _data, col } = await parse(
    state,
    action,
    "delete",
    signer,
    0,
    contractErr
);
  if (isNil_default(_data.__data))
    err(`Data doesn't exist`);
  let ind = getIndex(state, init_default(path3));
  removeData(last_default(path3), ind, col.__docs);
  _data.__data = null;
  return { state };
};

// contracts/common/actions/write/batch.js
var batch = async (state, action, signer, contractErr = true) => {
  signer ||= await validate(state, action, "batch");
  let _state = state;
  let i = 0;
  for (let v of action.input.query) {
    let [op, ...query] = v;
    const _action = { input: { function: op, query }, caller: action.caller };
    let res = null;
    switch (op) {
      case "add":
        res = await add3(_state, _action, signer, i, contractErr);
        break;
      case "set":
        res = await set3(_state, _action, signer, contractErr);
        break;
      case "update":
        res = await update3(_state, _action, signer, contractErr);
        break;
      case "upsert":
        res = await upsert(_state, _action, signer, contractErr);
        break;
      case "delete":
        res = await remove3(_state, _action, signer, contractErr);
        break;
      default:
        const msg = `No function supplied or function not recognised: "${op}"`;
        if (contractErr) {
          err(msg);
        } else {
          throw msg;
        }
    }
    _state = res.state;
    i++;
  }
  return { state: _state };
};

// contracts/common/actions/write/relay.js
var relay = async (state, action, signer, contractErr = true) => {
  signer ||= await validate(state, action, "relay");
  let jobID = head_default(action.input.query);
  let input = nth_default(1, action.input.query);
  let query = nth_default(2, action.input.query);
  if (input.jobID !== jobID)
    err("the wrong jobID");
  let action2 = { input, relayer: signer, extra: query, jobID };
  const relayers = state.relayers || {};
  if (isNil_default(relayers[jobID]))
    err("relayer jobID doesn't exist");
  if (!isNil_default(relayers[jobID].relayers)) {
    const allowed_relayers = map_default(toLower_default)(relayers[jobID].relayers || []);
    if (!includes_default(signer)(allowed_relayers))
      err("relayer is not allowed");
  }
  if (includes_default(relayers[jobID].multisig_type)(["number", "percent"])) {
    const allowed_signers = map_default(toLower_default)(relayers[jobID].signers || []);
    let signers = [];
    if (is_default(Array)(action.input.multisigs)) {
      const data = {
        extra: action2.extra,
        jobID,
        params: input
      };
      for (const signature of action.input.multisigs) {
        const _signer = (await read(state.contracts.ethereum, {
          function: "verify",
          data,
          signature
        })).signer;
        signers.push(_signer);
      }
    }
    const matched_signers = intersection_default(allowed_signers, signers);
    let min3 = 1;
    if (relayers[jobID].multisig_type === "percent") {
      min3 = Math.ceil(
        relayers[jobID].signers.length * (relayers[jobID].multisig || 100) / 100
      );
    } else if (relayers[jobID].multisig_type === "number") {
      min3 = relayers[jobID].multisig || 1;
    }
    if (matched_signers.length < min3) {
      err(
        `not enough number of allowed signers [${matched_signers.length}/${min3}] for the job[${jobID}]`
      );
    }
  }
  if (!isNil_default(relayers[jobID].schema)) {
    try {
      validateSchema(relayers[jobID].schema, query);
    } catch (e) {
      err("relayer data validation error");
    }
  }
  switch (action2.input.function) {
    case "add":
      return await add3(state, action2);
    case "set":
      return await set3(state, action2);
    case "update":
      return await update3(state, action2);
    case "upsert":
      return await upsert(state, action2);
    case "delete":
      return await remove3(state, action2);
    case "batch":
      return await batch(state, action2);
    default:
      err(
        `No function supplied or function not recognised: "${action2.input.function}"`
      );
  }
  return { state };
};

// contracts/common/actions/write/setSchema.js
var import_jsonschema2 = __toESM(require_jsonschema());
var setSchema = async (state, action, signer) => {
  signer ||= await validate(state, action, "setSchema");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "setSchema",
    signer
);
  _data.schema = new_data;
  try {
    (0, import_jsonschema2.validate)(void 0, clone3(_data.schema));
  } catch (e) {
    err("schema error");
  }
  return { state };
};

// contracts/common/actions/write/setRules.js
var import_json_logic_js2 = __toESM(require_logic());
var setRules = async (state, action, signer) => {
  signer ||= await validate(state, action, "setRules");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "setRules",
    signer
);
  for (let k in new_data) {
    const keys6 = k.split(" ");
    const permission = keys6[0];
    if (keys6.length !== 2 && permission !== "let")
    err();
    if (!includes_default(permission)(["allow", "deny", "let"]))
      err();
    if (keys6.length === 2) {
      const ops = keys6[1].split(",");
      if (difference_default(ops, ["write", "create", "update", "delete"]).length > 0) {
        err();
      }
    }
    if (permission !== "let" && !is_default(Boolean)(import_json_logic_js2.default.apply(new_data[k], {}))) {
      err();
    }
  }
  _data.rules = new_data;
  return { state };
};

// contracts/common/actions/write/addIndex.js
var addIndex4 = async (state, action, signer) => {
  signer ||= await validate(state, action, "addIndex");
  let { col, _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "addIndex",
    signer
);
  let ind = getIndex(state, path3);
  if (o_default(includes_default("__id__"), flatten_default)(new_data)) {
    err("index cannot contain __id__");
  }
  addIndex3(new_data, ind, col.__docs);
  return { state };
};

// contracts/common/actions/write/removeIndex.js
var removeIndex2 = async (state, action, signer) => {
  signer ||= await validate(state, action, "removeIndex");
  let { col, _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "removeIndex",
    signer
);
  let ind = getIndex(state, path3);
  removeIndex(new_data, ind, col.__docs);
  return { state };
};

// contracts/common/lib/cron.js
var executeCron = async (cron2, state) => {
  let vars = {
    block: {
      height: SmartWeave.block.height,
      timestamp: SmartWeave.block.timestamp
    }
  };
  let ops = { upsert, update: update3, add: add3, delete: remove3, set: set3, batch };
  const parse2 = (query) => {
    if (is_default(Array, query)) {
      query = map_default((v) => is_default(Object, v) ? parse2(v) : v)(query);
    } else if (is_default(Object, query)) {
      if (is_default(String, query.var)) {
        return path_default(query.var.split("."))(vars);
      } else {
        query = map_default((v) => parse2(v))(query);
      }
    }
    return query;
  };
  for (let job of cron2.crons.jobs) {
    const op = head_default(job);
    let _var = null;
    let query = null;
    if (includes_default(op)(["get", "let"])) {
      _var = job[1];
      query = job[2];
    } else {
      query = job[1];
    }
    if (op === "do") {
      g(query, vars);
    } else if (op === "let") {
      vars[_var] = g(query, vars);
    } else if (op === "get") {
      const _default = job[3];
      vars[_var] = (await get(state, {
        caller: state.owner,
        input: { function: "get", query: await parse2(query) }
      })).result || _default;
    } else if (includes_default(op)(["set", "upsert", "add", "delete", "update", "batch"])) {
      let params = [
        state,
        {
          caller: state.owner,
          input: { function: op, query: await parse2(query) }
        },
        true
      ];
      if (op === "add")
      params.push(0);
      params.push(false);
      await ops[op](...params);
    }
  }
};
var cron = async (state) => {
  const now = SmartWeave.block.timestamp;
  if (isNil_default(state.crons)) {
    state.crons = { lastExecuted: now, crons: {} };
  }
  const last2 = state.crons.lastExecuted;
  let crons = [];
  for (let k in state.crons.crons) {
    const v = state.crons.crons[k];
    let start = v.start;
    let end = v.end;
    let times3 = v.do ? 1 : 0;
    while (start <= now && (isNil_default(v.times) || v.times >= times3)) {
      if (start > last2 && isNil_default(end) || end >= start) {
        if (start !== v.start || v.do)
          crons.push({ start, crons: v });
      }
      start += v.span;
      times3 += 1;
    }
  }
  crons = sortBy_default(prop_default("start"))(crons);
  let _state = clone3(state);
  for (let cron2 of crons) {
    try {
      await executeCron(cron2, _state);
    } catch (e) {
      console.log(e);
    }
  }
  _state.crons.lastExecuted = SmartWeave.block.timestamp;
  return { state: _state };
};

// contracts/common/actions/write/addCron.js
var addCron = async (state, action, signer) => {
  signer ||= await validate(state, action, "addCron");
  const owner = isOwner(signer, state);
  if (isNil_default(state.crons)) {
    state.crons = { lastExecuted: SmartWeave.block.timestamp, crons: {} };
  }
  const [cron2, key] = action.input.query;
  let _cron = clone3(cron2);
  if (isNil_default(_cron.start)) {
    _cron.start = SmartWeave.block.timestamp;
  }
  if (SmartWeave.block.timestamp > _cron.start) {
    err("start cannot be before the block time");
  }
  if (!isNil_default(_cron.end) && SmartWeave.block.timestamp > _cron.end) {
    err("end cannot be before start");
  }
  if (isNil_default(_cron.jobs) || _cron.jobs.length === 0) {
    err("cron has no jobs");
  }
  if (isNil_default(_cron.span) || Number.isNaN(_cron.span * 1) || _cron.span <= 0) {
    err("span must be greater than 0");
  }
  state.crons.crons[key] = _cron;
  if (_cron.do) {
    try {
      await executeCron({ start: _cron.start, crons: _cron }, state);
    } catch (e) {
      console.log(e);
      err("cron failed to execute");
    }
  }
  return { state };
};

// contracts/common/actions/write/removeCron.js
var removeCron = async (state, action, signer) => {
  signer ||= await validate(state, action, "removeCron");
  const owner = isOwner(signer, state);
  if (isNil_default(state.crons)) {
    state.crons = { lastExecuted: SmartWeave.block.timestamp, crons: {} };
  }
  const [key] = action.input.query;
  if (isNil_default(state.crons.crons[key]))
    err("cron doesn't exist");
  delete state.crons.crons[key];
  return { state };
};

// contracts/common/actions/write/setAlgorithms.js
var setAlgorithms = async (state, action, signer) => {
  signer ||= await validate(state, action, "setAlgorithms");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "setAlgorithms",
    signer
);
  if (!is_default(Array)(new_data) || intersection_default(new_data)(["secp256k1", "ed25519", "rsa256", "secp256k1-2"]).length !== new_data.length) {
    throw new ContractError(`The wrong algorithms`);
  }
  state.auth.algorithms = new_data;
  return { state };
};

// contracts/common/actions/write/addRelayerJob.js
var import_jsonschema3 = __toESM(require_jsonschema());
var addRelayerJob = async (state, action, signer) => {
  signer ||= await validate(state, action, "addRelayerJob");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "addRelayerJob",
    signer
);
  const [jobID, job] = query;
  if (!isNil_default(job.relayers) && !is_default(Array, job.relayers)) {
    err("relayers must be Array");
  }
  if (!isNil_default(job.signers) && !is_default(Array, job.signers)) {
    err("signers must be Array");
  }
  if (!isNil_default(job.schema)) {
    try {
      (0, import_jsonschema3.validate)(void 0, clone3(job.schema));
    } catch (e) {
      err("schema error");
    }
  }
  if (isNil_default(state.relayers))
    state.relayers = {};
  state.relayers[jobID] = job;
  return { state };
};

// contracts/common/actions/write/removeRelayerJob.js
var import_jsonschema4 = __toESM(require_jsonschema());
var removeRelayerJob = async (state, action, signer) => {
  signer ||= await validate(state, action, "removeRelayerJob");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "removeRelayerJob",
    signer
);
  const [jobID] = query;
  if (isNil_default(state.relayers[jobID]))
    err("relayer job doesn't exist");
  delete state.relayers[jobID];
  return { state };
};

// contracts/common/actions/write/linkContract.js
var linkContract = async (state, action, signer) => {
  signer ||= await validate(state, action, "linkContract");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "linkContract",
    signer
);
  const [key, address] = action.input.query;
  if (isNil_default(key) || isNil_default(address)) {
    err(`Key or Address not specified`);
  }
  if (isNil_default(state.contracts))
    state.contracts = {};
  state.contracts[key] = address;
  return { state };
};

// contracts/common/actions/write/unlinkContract.js
var unlinkContract = async (state, action, signer) => {
  signer ||= await validate(state, action, "unlinkContract");
  let { _data, data, query, new_data, path: path3 } = await parse(
    state,
    action,
    "unlinkContract",
    signer
);
  const [key] = action.input.query;
  if (isNil_default(key)) {
    throw new ContractError(`Key not specified`);
  }
  if (isNil_default(state.contracts))
    state.contracts = {};
  delete state.contracts[key];
  return { state };
};

// contracts/common/warp/actions/write/evolve.js
var import_version = __toESM(require_version());
var evolve3 = async (state, action, signer) => {
  signer ||= await validate(state, action, "evolve");
  const owner = isOwner(signer, state);
  if (action.input.value !== action.input.query.value) {
    err("Values don't match.");
  }
  if (state.canEvolve) {
    state.evolve = action.input.value;
  } else {
    err(`This contract cannot evolve.`);
  }
  state.evolveHistory ||= [];
  state.evolveHistory.push({
    signer,
    block: SmartWeave.block.height,
    data: SmartWeave.block.timestamp,
    srcTxId: action.input.value,
    oldVersion: import_version.default
  });
  return { state };
};

// contracts/common/warp/actions/write/migrate.js
var import_version2 = __toESM(require_version());
var migrate = async (state, action, signer) => {
  signer ||= await validate(state, action, "migrate");
  const owner = isOwner(signer, state);
  if (import_version2.default !== action.input.query.version) {
    err(`version doesn't match (${import_version2.default} : ${action.input.query.version})`);
  }
  if (!isEvolving(state))
    err(`contract is not ready to migrate`);
  state.evolveHistory[state.evolveHistory.length - 1].newVersion = import_version2.default;
  return { state };
};

// contracts/common/actions/write/setCanEvolve.js
var setCanEvolve = async (state, action, signer) => {
  signer ||= await validate(state, action, "setCanEvolve");
  const owner = isOwner(signer, state);
  if (!is_default(Boolean)(action.input.query.value)) {
    err("Value must be a boolean.");
  }
  state.canEvolve = action.input.query.value;
  return { state };
};

// contracts/common/actions/write/setSecure.js
var setSecure = async (state, action, signer) => {
  signer ||= await validate(state, action, "setSecure");
  const owner = isOwner(signer, state);
  if (!is_default(Boolean)(action.input.query.value)) {
    err("Value must be a boolean.");
  }
  state.secure = action.input.query.value;
  return { state };
};

// contracts/common/actions/write/addOwner.js
var addOwner = async (state, action, signer) => {
  signer ||= await validate(state, action, "addOwner");
  const owner = isOwner(signer, state);
  if (!is_default(String)(action.input.query.address)) {
    err("Value must be string.");
  }
  if (!is_default(String)(action.input.query.address)) {
    err("Value must be string.");
  }
  if (includes_default(action.input.query.address, owner)) {
    err("The owner already exists.");
  }
  state.owner = append_default(action.input.query.address, owner);
  return { state };
};

// contracts/common/actions/write/removeOwner.js
var removeOwner = async (state, action, signer) => {
  signer ||= await validate(state, action, "removeOwner");
  const owner = isOwner(signer, state);
  if (!is_default(String)(action.input.query.address)) {
    err("Value must be string.");
  }
  if (!includes_default(action.input.query.address, owner)) {
    err("The owner doesn't exist.");
  }
  state.owner = without_default([action.input.query.address], owner);
  return { state };
};

// contracts/common/actions/write/addAddressLink.js
var addAddressLink = async (state, action, signer) => {
  signer ||= await validate(state, action, "addAddressLink");
  const { address, signature, expiry } = action.input.query;
  if (!isNil_default(expiry) && !is_default(Number, expiry))
    err("expiry must be a number");
  const { nonce: nonce2 } = action.input;
  let _expiry = expiry || 0;
  const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "verifyingContract", type: "string" }
  ];
  const domain = {
    name: state.auth.name,
    version: state.auth.version,
    verifyingContract: SmartWeave.contract.id
  };
  const query = typeof expiry === "undefined" ? { address: signer } : { address: signer, expiry };
  const message = {
    nonce: nonce2,
    query: JSON.stringify({
      func: "auth",
      query
    })
  };
  const data = {
    types: {
      EIP712Domain,
      Query: [
        { name: "query", type: "string" },
        { name: "nonce", type: "uint256" }
      ]
    },
    domain,
    primaryType: "Query",
    message
  };
  let signer2 = (await SmartWeave.contracts.viewContractState(state.contracts.ethereum, {
    function: "verify712",
    data,
    signature
  })).result.signer;
  const _signer = signer2.toLowerCase();
  if (_signer !== address.toLowerCase())
    err();
  const link = state.auth.links[address.toLowerCase()];
  if (!isNil_default(link)) {
    let prev_expiry = is_default(Object, link) ? link.expiry || 0 : 0;
    if (SmartWeave.block.timestamp < prev_expiry) {
      err("link already exists");
    }
  }
  state.auth.links[address.toLowerCase()] = {
    address: signer,
    expiry: expiry === 0 ? 0 : SmartWeave.block.timestamp + expiry
  };
  return { state };
};

// contracts/common/actions/write/removeAddressLink.js
var removeAddressLink = async (state, action, signer) => {
  signer ||= await validate(state, action, "removeAddressLink");
  const { address } = action.input.query;
  const link = state.auth.links[address.toLowerCase()];
  if (isNil_default(link))
    err("link doesn't exist");
  let _address = is_default(Object, link) ? link.address : link;
  if (signer !== address.toLowerCase() && signer !== _address) {
    err("signer is neither owner nor delegator");
  }
  delete state.auth.links[address.toLowerCase()];
  return { state };
};

// contracts/warp/contract.js
var import_version3 = __toESM(require_version());
var writes = [
  "relay",
  "set",
  "setSchema",
  "setRules",
  "addIndex",
  "removeIndex",
  "add",
  "upsert",
  "remove",
  "batch",
  "addCron",
  "removeCron",
  "setAlgorithms",
  "addRelayerJob",
  "linkContract",
  "unlinkContract",
  "setCanEvolve",
  "setSecure",
  "addOwner",
  "removeOwner",
  "addAddressLink",
  "removeAddressLink"
];
async function handle(state, action) {
  if (isEvolving(state) && includes_default(action.input.function)(writes)) {
    err("contract needs migration");
  }
  try {
    ;
    ({ state } = await cron(state));
  } catch (e) {
    console.log(e);
  }
  switch (action.input.function) {
    case "relay":
      return await relay(state, action);
    case "getAddressLink":
      return await getAddressLink(state, action);
    case "addAddressLink":
      return await addAddressLink(state, action);
    case "removeAddressLink":
      return await removeAddressLink(state, action);
    case "add":
      return await add3(state, action);
    case "set":
      return await set3(state, action);
    case "update":
      return await update3(state, action);
    case "upsert":
      return await upsert(state, action);
    case "get":
      return await get(state, action);
    case "cget":
      return await get(state, action, true);
    case "listCollections":
      return await listCollections(state, action);
    case "getInfo":
      return await getInfo(state, action);
    case "addCron":
      return await addCron(state, action);
    case "removeCron":
      return await removeCron(state, action);
    case "getCrons":
      return await getCrons(state, action);
    case "getAlgorithms":
      return await getAlgorithms(state, action);
    case "getLinkedContract":
      return await getLinkedContract(state, action);
    case "setAlgorithms":
      return await setAlgorithms(state, action);
    case "listRelayerJobs":
      return await listRelayerJobs(state, action);
    case "getRelayerJob":
      return await getRelayerJob(state, action);
    case "addRelayerJob":
      return await addRelayerJob(state, action);
    case "removeRelayerJob":
      return await removeRelayerJob(state, action);
    case "linkContract":
      return await linkContract(state, action);
    case "unlinkContract":
      return await unlinkContract(state, action);
    case "addIndex":
      return await addIndex4(state, action);
    case "getIndexes":
      return await getIndexes(state, action);
    case "removeIndex":
      return await removeIndex2(state, action);
    case "setSchema":
      return await setSchema(state, action);
    case "getSchema":
      return await getSchema(state, action);
    case "setRules":
      return await setRules(state, action);
    case "getRules":
      return await getRules(state, action);
    case "nonce":
      return await nonce(state, action);
    case "version":
      return { result: import_version3.default };
    case "ids":
      return await ids(state, action);
    case "delete":
      return await remove3(state, action);
    case "batch":
      return await batch(state, action);
    case "getOwner":
      return await getOwner(state, action);
    case "addOwner":
      return await addOwner(state, action);
    case "removeOwner":
      return await removeOwner(state, action);
    case "getEvolve":
      return await getEvolve(state, action);
    case "evolve":
      return await evolve3(state, action);
    case "migrate":
      return await migrate(state, action);
    case "setCanEvolve":
      return await setCanEvolve(state, action);
    case "setSecure":
      return await setSecure(state, action);
    default:
      err(
        `No function supplied or function not recognised: "${action.input.function}"`
      );
  }
  return { state };
}

/*! https://mths.be/punycode v1.3.2 by @mathias */
