# SYNOPSIS 

[![NPM Package](https://img.shields.io/npm/v/buffer-pipe.svg?style=flat-square)](https://www.npmjs.org/package/buffer-pipe)
[![Build Status](https://img.shields.io/travis/wanderer/buffer-pipe.svg?branch=master&style=flat-square)](https://travis-ci.org/wanderer/buffer-pipe)
[![Coverage Status](https://img.shields.io/coveralls/wanderer/buffer-pipe.svg?style=flat-square)](https://coveralls.io/r/wanderer/buffer-pipe)

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

 A simple pipe for buffers. Write data to one end and read data off the other end.

# INSTALL
`npm install buffer-pipe`

# USAGE

```javascript
const pipe = require('buffer-pipe')

const p = new Pipe()
p.write(Buffer.from([1,2,3,4]))
const buf = p.read(2)

// <1, 2>
```

# API


## constructor

[index.js:8-12](https://github.com/wanderer/buffer-pipe/blob/9aa3e2f794fab45e36fada634829fdb4260dcdea/index.js#L8-L12 "Source code on GitHub")

Creates a new instance of a pipe

**Parameters**

-   `buf` **[Buffer](https://nodejs.org/api/buffer.html)** an optional buffer to start with (optional, default `Buffer.from([])`)

## read

[index.js:19-24](https://github.com/wanderer/buffer-pipe/blob/9aa3e2f794fab45e36fada634829fdb4260dcdea/index.js#L19-L24 "Source code on GitHub")

read `num` number of bytes from the pipe

**Parameters**

-   `num` **[Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** 

Returns **[Buffer](https://nodejs.org/api/buffer.html)** 

## write

[index.js:30-34](https://github.com/wanderer/buffer-pipe/blob/9aa3e2f794fab45e36fada634829fdb4260dcdea/index.js#L30-L34 "Source code on GitHub")

Wites a buffer to the pipe

**Parameters**

-   `buf` **[Buffer](https://nodejs.org/api/buffer.html)** 

## end

[index.js:40-42](https://github.com/wanderer/buffer-pipe/blob/9aa3e2f794fab45e36fada634829fdb4260dcdea/index.js#L40-L42 "Source code on GitHub")

Whether or not there is more data to read from the buffer
returns {Boolean}

## bytesRead

[index.js:48-50](https://github.com/wanderer/buffer-pipe/blob/9aa3e2f794fab45e36fada634829fdb4260dcdea/index.js#L48-L50 "Source code on GitHub")

returns the number of bytes read from the stream

Returns **Integer** 

## bytesWrote

[index.js:56-58](https://github.com/wanderer/buffer-pipe/blob/9aa3e2f794fab45e36fada634829fdb4260dcdea/index.js#L56-L58 "Source code on GitHub")

returns the number of bytes wrote to the stream

Returns **Integer** 

# LICENSE
[MPL-2.0][LICENSE]

[LICENSE]: https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)
