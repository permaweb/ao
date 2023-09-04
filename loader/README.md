# ao Wasm Loader

This module takes an `ao` Wasm `ArrayBuffer` and returns a `handle` function,
that given `SmartWeaveContract` inputs, will produce a `result`.

The handle function can be invoked just like any other `SmartWeaveContract`

## Usage

The `@permaweb/ao-loader` MUST receive an `ArrayBuffer` that contains the Wasm
to be invoked:

```js
import AoLoader from "@permaweb/ao-loader";

/* SmartWeave READ-ONLY Env Variables */
const SmartWeave = {
  transaction: {
    id: "1",
  },
};

// Create the handle function that executes the Wasm
const handle = AoLoader(wasmBinary);

// Now invoke the handle
const result = await handle({ balances: 1 }, {
  caller: "1",
  input: { function: "balance" },
}, SmartWeave);
```

### Using a File

You can use `fs` to a load a Wasm file from the local filesystem as a Node
`Buffer`. Since a Node `Buffer` implements `ArrayBuffer`, it can be passed
directly to the `AoLoader` directly!

> To get back a Node `Buffer`, make sure to **NOT** pass an `encoding` parameter
> to `readFile`

```js
import AoLoader from "@permaweb/ao-loader";
import fs from "fs";

async function main() {
  const wasmBinary = fs.readFileSync("contract.wasm");
  const handle = AoLoader(wasmBinary);
  const result = await handle(...);
}
```

### Using `fetch`

You can also use native `fetch` to retrieve the Wasm as an `ArrayBuffer`. This
is great if you're fetching a Wasm contract published on Arweave:

```js
import AoLoader from "@permaweb/ao-loader";

async function main() {
  const tx_id = '...'
  const wasmBinary = await fetch(`https://arweave.net/${tx_id}`)
    .then(res => res.arrayBuffer())
  const handle = AoLoader(wasmBinary);
  const result = await handle(...)
}
```
