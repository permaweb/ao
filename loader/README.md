# ao Wasm Loader

This module takes an `ao` Wasm `ArrayBuffer` and returns a `handle` function,
that given an `ao-process` message, will produce a `result`.

<!-- toc -->

- [Usage](#usage)
  - [Using a File](#using-a-file)
  - [Using `fetch`](#using-fetch)
  - [Result Object](#result-object)
- [Contributing](#contributing)
  - [Publish a new Version of the package](#publish-a-new-version-of-the-package)

<!-- tocstop -->

## Usage

The `@permaweb/ao-loader` MUST receive an `ArrayBuffer` that contains the Wasm
to be invoked:

```js
import AoLoader from "@permaweb/ao-loader";

/* ao READ-ONLY Env Variables */
const env = {
  Process: {
    Id: "2",
    Tags: [
      { name: "Authority", value: "XXXXXX" },
    ],
  },
};

// Create the handle function that executes the Wasm
const handle = await AoLoader(wasmBinary, {
  format = "wasm32-unknown-emscripten2",
  inputEncoding = "JSON-1",
  outputEncoding = "JSON-1", 
  memoryLimit = "524288000", // in bytes
  computeLimit = 9e12.toString(),
  extensions = []
});

// To spawn a process, pass null as the buffer
const result = await handle(null, {
  Owner: "OWNER_ADDRESS",
  Target: "XXXXX",
  From: "YYYYYY",
  Tags: [
    { name: "Action", value: "Ping" },
  ],
  Data: "ping",
}, env);
```

// To evaluate a message on an existing process

```js
const options = {
  format = "wasm32-unknown-emscripten2",
  inputEncoding = "JSON-1",
  outputEncoding = "JSON-1", 
  memoryLimit = "524288000", // in bytes
  computeLimit = 9e12.toString(),
  extensions = []
}
const handle = await AoLoader(wasmBinary, options);
const buffer = await LoadFromCache();

const result = await handle(buffer, {
  Owner: "OWNER_ADDRESS",
  Tags: [
    { name: "Action", value: "Balance" },
    { name: "Target", value: "vh-NTHVvlKZqRxc8LyyTNok65yQ55a_PJ1zWLb9G2JI" },
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
  const wasmBinary = fs.readFileSync("process.wasm");
  const options = {
    format = "wasm32-unknown-emscripten2",
    inputEncoding = "JSON-1",
    outputEncoding = "JSON-1", 
    memoryLimit = "524288000", // in bytes
    computeLimit = 9e12.toString(),
    extensions = []
  }
  const handle = AoLoader(wasmBinary, options);
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
  const options = {
    format = "wasm32-unknown-emscripten2",
    inputEncoding = "JSON-1",
    outputEncoding = "JSON-1", 
    memoryLimit = "524288000", // in bytes
    computeLimit = 9e12.toString(),
    extensions = []
  }

  const handle = AoLoader(wasmBinary, options);
  const result = await handle(...)
}
```

### Result Object

The `Result` Object returns a Successful Result:

```
{
  Output,
  Messages,
  Spawns,
  Assignments,
  GasUsed
}
```

Or an unSuccessful Result:

```
{
  Error
}
```

## Contributing

### Publish a new Version of the package

We use a Github workflow to build and publish new version of the Loader to NPM.
To publish a new version, go to the
[`ao` Loader workflow](https://github.com/permaweb/ao/actions/workflows/loader.yml)
and click the `Run Workflow` button. Provide the semver compatible version you
would like to bump to, and then click `Run Workflow`. This will trigger a
Workflow Dispatch that will bump the version is the manifest files, build the module, and finally publish it to NPM
