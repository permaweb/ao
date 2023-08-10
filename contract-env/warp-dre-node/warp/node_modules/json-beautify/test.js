var beautifier = require(".");

console.log(beautifier(
  {
    str: "Hello World",
    num: 42,
    smallarray: [ 1, 2, 3, "foo", {} ],
    smallobject: { foo: "bar", bar: 42 },
    bigarray: [ 1, 2, 3, "foo", { foo: "bar", bar: 42, arr: [ 1, 2, 3, "foo", {} ] } ],
    bigobject: { foo: [ 1, 2, 3, "foo", {} ], bar: 42, a: {b: { c: 42 }}, foobar: "FooBar" }
  },
  null,
  2,
  process.argv[2] ? parseInt(process.argv[2], 10): 80
));
