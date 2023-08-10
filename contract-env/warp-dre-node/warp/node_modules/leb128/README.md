# SYNOPSIS 
[![NPM Package](https://img.shields.io/npm/v/leb128.svg?style=flat-square)](https://www.npmjs.org/package/leb128)
[![Build Status](https://img.shields.io/travis/wanderer/leb128.svg?branch=master&style=flat-square)](https://travis-ci.org/wanderer/leb128)
[![Coverage Status](https://img.shields.io/coveralls/wanderer/leb128.svg?style=flat-square)](https://coveralls.io/r/wanderer/leb128)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

[LEB128](https://en.wikipedia.org/wiki/LEB128) encoding and decoding for signed and unsinged intergers. Supports arbitary length intergers larger then `Number.MAX_SAFE_INTEGER`

# INSTALL
`npm install leb128`

# USAGE
```javascript
const leb = require('leb128')
let encoded = leb.unsigned.encode('9019283812387')
console.log(encoded)
// <Buffer a3 e0 d4 b9 bf 86 02>

let decoded = leb.unsigned.decode(encoded)
console.log(decoded)
// 9019283812387

encoded = leb.signed.encode('-9019283812387')
console.log(encoded)
// <Buffer dd 9f ab c6 c0 f9 7d>

decoded = leb.signed.decode(encoded)
console.log(decoded)
// '-9019283812387'
```

# API
Use `require('leb128/signed')` for signed encoding and decoding and 
`require('leb128/unsigned')` for unsigned methods

## encode

LEB128 encodeds an intergerl.

**Parameters**

-   `num` **([String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) \| [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number))** 

Returns **[Buffer](https://nodejs.org/api/buffer.html)** 

## decode

decodes a LEB128 encoded interger

**Parameters**

-   `buffer` **[Buffer](https://nodejs.org/api/buffer.html)** 

Returns **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

# LICENSE
[MPL-2.0](https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2))
