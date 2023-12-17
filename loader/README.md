# ao Wasm Loader

This module takes an `ao` Wasm `ArrayBuffer` and returns a `handle` function,
that given an `ao-process` message, will produce a `result`.

<!-- toc -->

- [Usage](#usage)
  - [Using a File](#using-a-file)
  - [Using `fetch`](#using-fetch)

<!-- tocstop -->

## Usage

The `@permaweb/ao-loader` MUST receive an `ArrayBuffer` that contains the Wasm
to be invoked:

```js
import AoLoader from "@permaweb/ao-loader";

/* ao READ-ONLY Env Variables */
const env = {
  Process: {
    id: "2",
  },
};

// Create the handle function that executes the Wasm
const handle = await AoLoader(wasmBinary);

// To spawn a process, pass null as the buffer
const result = await handle(null, {
  Owner: "OWNER_ADDRESS",
  Tags: [
    { name: "function", value: "balance" },
    { name: "target", value: "vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI" },
  ],
}, env);
```

// To evaluate a message on an existing process

```js
const handle = await AoLoader(wasmBinary);
const buffer = await LoadFromCache();

const result = await handle(buffer, {
  Owner: "OWNER_ADDRESS",
  Tags: [
    { name: "function", value: "balance" },
    { name: "target", value: "vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI" },
  ],
}, env);

saveToCache(result.Memory);
console.log(result.Output);
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
