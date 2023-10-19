# AO SDK

This sdk will run in a browser or server environment, the purpose is to abstract
interacting with the infrastructure needed for deploying, evaluating, and
interacting with `ao` Smart Contracts.

- Reads state from a `ao` Compute Unit `cu`
- Writes interactions to an `ao` Message Unit `mu`
- Deploys Contracts to `Irys` as a Data Item, then registers the contract on the
  `Warp Gateway`

<!-- toc -->

- [Usage](#usage)
    - [ESM (Node & Browser) aka type: `module`](#esm-node--browser-aka-type-module)
    - [CJS (Node) type: `commonjs`](#cjs-node-type-commonjs)
  - [API](#api)
    - [`readState`](#readstate)
    - [`writeMessage`](#writemessage)
    - [`createProcess`](#createprocess)
    - [`createDataItemSigner`](#createdataitemsigner)
- [Debug Logging](#debug-logging)
- [Testing](#testing)
- [Project Structure](#project-structure)

<!-- tocstop -->

## Usage

This module can be used on the server, as well as the browser:

#### ESM (Node & Browser) aka type: `module`

```js
import { createProcess, readState, writeMessage } from "@permaweb/ao-sdk";
```

#### CJS (Node) type: `commonjs`

```js
const { readState, writeMessage, createProcess } = require(
  "@permaweb/ao-sdk",
);
```

The duration of this document will use `ESM` for examples

### API

#### `readState`

Read the state of a contract from an `ao` Compute Unit `cu`

```js
import { readState } from "@permaweb/ao-sdk";

let state = await readState({
  processId: "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro",
});
// or update to certain sort-key
state = await readState({
  processId: "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro",
  sortKey:
    "000001262259,1694820900780,7160a8e16721d271f96a24ad007a5f54b7e22ae49363652eb7356464fcbb09ed",
});
```

#### `writeMessage`

write a message to an `ao` Message Unit `mu` targeting an ao `process`.

```js
import { createDataItemSigner, writeMessage } from "@permaweb/ao-sdk";

const messageId = await writeMessage({
  processId,
  input,
  signer: createDataItemSigner(wallet),
  tags,
});
```

#### `createProcess`

Create a contract, publishing to Arys, then registering it on the Warp Gateway

```js
import { createProcess, createDataItemSigner } from "@permaweb/ao-sdk";

const processId = await createProcess({
  srcId,
  signer: createDataItemSigner(wallet),
  tags,
});
```

#### `createDataItemSigner`

`writeMessage` and `createProcess` both require signing a data item with a
wallet.

`createDataItemSigner` is a convenience api that, given a wallet, returns a
function that can be passed to both `writeMessage` and `createProcess` in
order to properly sign data items.

The SDK provides a browser compatible and node compatible version that you can
use OOTB.

The `browser` compatible versions expects an instance of `window.arweaveWallet`
to be passed to it:

```js
import { createDataItemSigner } from "@permaweb/ao-sdk";

const signer = createDataItemSigner(globalThis.arweaveWallet);
```

The `node` compatible versions expects a JWK interface to be passed to it:

```js
import fs from "node:fs";
import { createDataItemSigner } from "@permaweb/ao-sdk";

const wallet = JSON.parse(fs.readFileSync(process.env.PATH_TO_WALLET));
const signer = createDataItemSigner(wallet);
```

You can also implement your own `createDataItemSigner`, as long as it satisfies
the api. Here is what the API looks like in TypeScript:

```ts
type CreateDataItemSigner = (wallet: any):
  (args: { data: any, tags: { name: string, value: string}[] }):
    Promise<{ id: string, raw: ArrayBuffer }>
```

## Debug Logging

You can enable verbose debug logging on the SDK. All logging is scoped under the
name `@permaweb/ao-sdk*`. You can use wildcards to enable a subset of logs ie.
`@permaweb/ao-sdk/readState*`

For Node, set the `DEBUG` environment variable to the logs you're interested in.

For the Browser, set the `localStorage.debug` variable to the logs you're
interested in.

## Testing

Run `npm test` to run the tests.

Run `npm run test:integration` to run the integration tests.

## Project Structure

The `ao` SDK project loosely implements the
[Ports and Adapters](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0)
Architecture.

All business logic is in `lib` where each public api is implemented and tested.

`dal.js` contains the contracts for the driven adapters aka side-effects.
Implementations for those contracts are injected into, then parsed and invoked
by, the business logic. This is how we inject specific integrations for
providers ie. `Warp`, `Irys`, or even platforms specific implementations like
`node` and the `browser` while keeping them separated from the business logic --
the business logic simply consumes a black-box API -- easy to stub, and easy to
unit test.

Because the contract wrapping is done by the business logic itself, it also
ensures the stubs we use in our unit tests accurately implement the contract
API. Thus our unit tests are simoultaneously contract tests.

`client` contains implementations, of the contracts in `dal.js`, for various
platforms. The unit tests for the implementations in `client` also import
contracts from `dal.js` to help ensure that the implementation properly
satisfies the API.

Finally, the entrypoints (`index.js` for Node and `index.browser.js` for the
Browser) orchestrate everything, choosing the appropriate implementations from
`client` and injecting them into the business logic from `lib`.
