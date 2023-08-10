# SYNOPSIS

[![NPM Package](https://img.shields.io/npm/v/wasm-metering.svg?style=flat-square)](https://www.npmjs.org/package/wasm-metering)
[![Build Status](https://img.shields.io/travis/ewasm/wasm-metering.svg?branch=master&style=flat-square)](https://travis-ci.org/ewasm/wasm-metering)
[![Coverage Status](https://img.shields.io/coveralls/ewasm/wasm-metering.svg?style=flat-square)](https://coveralls.io/r/ewasm/wasm-metering)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

**warp-wasm-metering is a fork of https://github.com/ewasm/wasm-metering. It uses warp-wasm-json-toolkit instead of wasm-json-toolkit which provides consistent API for Buffer object between server and client by using `safe-buffer` library for node and `buffer` for browser.**

Injects metering into webassembly binaries. The metering counts computation
time for a given program in units of `gas`. The metered wasm binary expects an
import that functions as the gas counter. This works for binary version 0x1.
For a more detailed description of how this works see [metering.md](https://github.com/ewasm/design/blob/master/metering.md)

# INSTALL

`npm install warp-wasm-metering`

# USAGE

```javascript
const fs = require('fs');
const metering = require('warp-wasm-metering');

const wasm = fs.readFileSync('fac.wasm');
const meteredWasm = metering.meterWASM(wasm, {
  meterType: 'i32',
});

const limit = 90000000;
let gasUsed = 0;

const mod = WebAssembly.Module(meteredWasm.module);
const instance = WebAssembly.Instance(mod, {
  metering: {
    usegas: (gas) => {
      gasUsed += gas;
      if (gasUsed > limit) {
        throw new Error('out of gas!');
      }
    },
  },
});

const result = instance.exports.fac(6);
console.log(`result:${result}, gas used ${gasUsed * 1e-4}`); // result:720, gas used 0.4177
```

[Source](./example/index.js)

# API

## meterJSON

[./index.js:104-224](https://github.com/ewasm/wasm-metering/blob/5ab76de89bc07d0abfaa6d0c776c204a752a0d9d/./index.js#L104-L224 'Source code on GitHub')

Injects metering into a JSON output of [wasm2json](https://github.com/ewasm/wasm-json-toolkit#wasm2json)

**Parameters**

- `json` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** the json tobe metered
- `opts` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**
  - `opts.costTable` **\[[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)]** the cost table to meter with. See these notes about the default. (optional, default `defaultTable`)
  - `opts.moduleStr` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** the import string for the metering function (optional, default `'metering'`)
  - `opts.fieldStr` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** the field string for the metering function (optional, default `'usegas'`)
  - `opts.meterType` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32` (optional, default `'i64'`)

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** the metered json

## meterWASM

[./index.js:236-240](https://github.com/ewasm/wasm-metering/blob/5ab76de89bc07d0abfaa6d0c776c204a752a0d9d/./index.js#L236-L240 'Source code on GitHub')

Injects metering into a webassembly binary

**Parameters**

- `json` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** the json tobe metered
- `opts` **\[[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)](default {})**
  - `opts.costTable` **\[[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)]** the cost table to meter with. See these notes about the default. (optional, default `defaultTable`)
  - `opts.moduleStr` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** the import string for the metering function (optional, default `'metering'`)
  - `opts.fieldStr` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** the field string for the metering function (optional, default `'usegas'`)
  - `opts.meterType` **\[[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32` (optional, default `'i64'`)
- `wasm`

Returns **[Buffer](https://nodejs.org/api/buffer.html)**

## costTable

The costTable option defines the cost of each of the operations.
Cost Tables consist of an object whose keys are sections in a wasm binary.
For example

```
module.exports = {
  'start': 1,
  'type': {
    'params': {
      'DEFAULT': 1
    },
    'return_type': {
      'DEFAULT': 1
    }
  },
  'import': 1,
  'code': {
    'locals': {
      'DEFAULT': 1
    },
    'code': {
      'DEFAULT': 1
    }
  },
  'memory': (entry) => {
    return entry.maximum * 10
  },
  'data': 5
}

```

Keys can either map to a function which will be given that section's entries or
an integer which will be used as the cost for each entry or an object whose
keys are matched against the [JSON representation](https://github.com/ewasm/wasm-json-toolkit) of the code.
The default cost table used is from [here](https://github.com/ewasm/design/blob/master/determining_wasm_gas_costs.md)

The cost table can use a special key 'DEFAULT' that will be used as the cost value for any fields in a section that are not defined.

## Initial Cost

The Initial cost for instantation for the module is calculated from all the
sections other than the code section (which is metered at runtime). This information is
stored as a [custom section](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#name-section)
that is inserted directly after the preamble. It uses the the name `initCost` and
its payload contains the initial cost encoded as an unsigned leb128 interger.

# LICENSE

[MPL-2.0](<https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)>)
