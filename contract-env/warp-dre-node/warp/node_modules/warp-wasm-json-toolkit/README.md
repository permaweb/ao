# SYNOPSIS

[![NPM Package](https://img.shields.io/npm/v/wasm-json-toolkit.svg?style=flat-square)](https://www.npmjs.org/package/wasm-json-toolkit)
[![Build Status](https://img.shields.io/travis/ewasm/wasm-json-toolkit.svg?branch=master&style=flat-square)](https://travis-ci.org/ewasm/wasm-json-toolkit)
[![Coverage Status](https://img.shields.io/coveralls/ewasm/wasm-json-toolkit.svg?style=flat-square)](https://coveralls.io/r/ewasm/wasm-json-toolkit)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

warp-wasm-json-toolkit is a fork of https://github.com/ewasm/wasm-json-toolkit which provides consistent API for Buffer object between server and client by using `safe-buffer` library for node and `buffer` for browser.

A small toolkit for converting wasm binaries into json and back.

# INSTALL

`npm install warp-wasm-json-toolkit`

# USAGE

```javascript
const fs = require('fs');
const wasm2json = require('warp-wasm-json-toolkit').wasm2json;

const wasm = fs.readFileSync('./test.wasm');
const json = wasm2json(wasm);

console.log(JSON.stringify(json, null, 2));
```

# CLI

Install `-g` global for cli usage.

`wasm2json [FILE]` given a file containing a wasm module produces a json representation  
`json2wasm [FILE]` given a file containing a json representation produces a wasm module

# API

# wasm2json

converts a wasm binary into a json representation

**Parameters**

- `Buffer` - The Webassembly Binary
- `filter` - `Set` containing the name of sections to parse. If no filter is given all sections will be parsed

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**

# json2wasm

converts a json representation to a wasm binary

**Parameters**

- `Object`

Returns **[Buffer](https://nodejs.org/api/buffer.html)**

# text2json

converts text to json. The only text accepted is a simple list of opcode name and immediates

**Parameters**

- `String`

**Examples**

```javascript
const codeStr = `
i64.const 1
i64.const 2
i64.add
`;
const json = text2json(codeStr);
```

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**

# iterator

[iterator.js:12-58](https://github.com/ewasm/wasm-json-toolkit/blob/e9fdd9498451b39b84c1167e78dc4aad03b055bd/iterator.js#L12-L58 'Source code on GitHub')

The Module Iterator allows for iteration over a webassembly module's sections.
A section is wrapped in a section class. A section class instance allows you
append entries to a given section

**Examples**

```javascript
const it = new Iterator(wasm);
for (const section of it) {
  console.log(section.type);
  const json = section.toJSON();
}
```

## wasm

[iterator.js:26-32](https://github.com/ewasm/wasm-json-toolkit/blob/e9fdd9498451b39b84c1167e78dc4aad03b055bd/iterator.js#L26-L32 'Source code on GitHub')

if the orignal wasm module was modified then this will return the modified
wasm module

## iterator

[iterator.js:38-52](https://github.com/ewasm/wasm-json-toolkit/blob/e9fdd9498451b39b84c1167e78dc4aad03b055bd/iterator.js#L38-L52 'Source code on GitHub')

Iterates through the module's sections
return {Iterator.<Section>}

# Section

[iterator.js:64-110](https://github.com/ewasm/wasm-json-toolkit/blob/e9fdd9498451b39b84c1167e78dc4aad03b055bd/iterator.js#L64-L110 'Source code on GitHub')

The section class is always internal created by the Module class. And return
through the Module's iternator

## toJSON

[iterator.js:83-85](https://github.com/ewasm/wasm-json-toolkit/blob/e9fdd9498451b39b84c1167e78dc4aad03b055bd/iterator.js#L83-L85 'Source code on GitHub')

Parses the section and return the JSON repesentation of it
returns {Object}

## appendEntries

[iterator.js:92-109](https://github.com/ewasm/wasm-json-toolkit/blob/e9fdd9498451b39b84c1167e78dc4aad03b055bd/iterator.js#L92-L109 'Source code on GitHub')

Appends an array of entries to this section. NOTE: this will modify the
parent wasm module.

**Parameters**

- `entries` **Arrayy&lt;[Buffer](https://nodejs.org/api/buffer.html)>**

## exammple json output

wast

```
(module
  (func $addTwo (param i32 i32) (result i32)
    (i32.add
      (get_local 0)
      (get_local 1)))
  (export "addTwo" (func $addTwo)))
```

wasm

```
0x010661646454776f00000a09010700200020016a0b
```

json

```
[
  {
    "name": "preramble",
    "magic": [0,97,115,109],
    "version": [13,0,0,0]
  },
  {
    "name": "type",
    "entries": [
      {
        "form": "func",
        "params": ["i32","i32"],
        "return_type": "i32"
      }
    ]
  },
  {
    "name": "function",
    "entries": [0]
  },
  {
    "name": "export",
    "entries": [
      {
        "field_str": "addTwo",
        "kind": "Function",
        "index": 0
      }
    ]
  },
  {
    "name": "code",
    "entries": [
      {
        "locals": [],
        "code": [
          {
            "name": "get_local",
            "immediaties": "0"
          },
          {
            "name": "get_local",
            "immediaties": "1"
          },
          {
            "return_type": "i32",
            "name": "add"
          },
          {
            "name": "end"
          }
        ]
      }
    ]
  }
]
```

# LICENSE

[MPL-2.0][license]

[license]: https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)
