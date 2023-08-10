json-beautify
=============
JSON.stringify with fixed maximum character width.

**json-beautify** is a fork of `JSON.stringify` [json2.js](https://github.com/douglascrockford/JSON-js/blob/master/json2.js) implementation.


It has the exact same signature of `JSON.stringify` but it also adds an optional 4th parameter:

The maximum fixed character width (for instance 80).

## Examples:

```js
var beautify = require("json-beautify");

var obj = { str: "Hello World", num: 42, smallarray: [ 1, 2, 3, "foo", {} ], smallobject: { foo: "bar", bar: 42 }, bigarray: [ 1, 2, 3, "foo", { foo: "bar", bar: 42, arr: [ 1, 2, 3, "foo", {} ] } ], bigobject: { foo: [ 1, 2, 3, "foo", {} ], bar: 42, a: {b: { c: 42 }}, foobar: "FooBar" } };
```


### With 100 fixed-spaces:

```js
console.log(beautify(obj, null, 2, 100));
```

```json
{
  "str": "Hello World",
  "num": 42,
  "smallarray": [ 1, 2, 3, "foo", {} ],
  "smallobject": { "foo": "bar", "bar": 42 },
  "bigarray": [ 1, 2, 3, "foo", { "foo": "bar", "bar": 42, "arr": [ 1, 2, 3, "foo", {} ] } ],
  "bigobject": { "foo": [ 1, 2, 3, "foo", {} ], "bar": 42, "a": { "b": { "c": 42 } }, "foobar": "FooBar" }
}
```

### With 80 fixed-spaces:

```js
console.log(beautify(obj, null, 2, 80));
```

```json
{
  "str": "Hello World",
  "num": 42,
  "smallarray": [ 1, 2, 3, "foo", {} ],
  "smallobject": { "foo": "bar", "bar": 42 },
  "bigarray": [
    1,
    2,
    3,
    "foo",
    { "foo": "bar", "bar": 42, "arr": [ 1, 2, 3, "foo", {} ] }
  ],
  "bigobject": {
    "foo": [ 1, 2, 3, "foo", {} ],
    "bar": 42,
    "a": { "b": { "c": 42 } },
    "foobar": "FooBar"
  }
}
```
