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
    - [`writeInteraction`](#writeinteraction)
    - [`createContract`](#createcontract)
    - [`createDataItemSigner`](#createdataitemsigner)
- [Debug Logging](#debug-logging)
- [Testing](#testing)

<!-- tocstop -->

## Usage

This module can be used on the server, as well as the browser:

#### ESM (Node & Browser) aka type: `module`

```js
import { createContract, readState, writeInteraction } from "@permaweb/ao-sdk";
```

> **In the browser**, You'll need to make sure that `globalThis.arweave` is set
> to an instance of the `arweave` JS client and that `arweaveWallet` connector
> is available

```js
import Arweave from "arweave";

globalThis.arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});
```

#### CJS (Node) type: `commonjs`

```js
const { readState, writeInteraction, createContract } = require(
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
  contractId: "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro",
});
// or update to certain sort-key
state = await readState({
  contractId: "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro",
  sortKey:
    "000001262259,1694820900780,7160a8e16721d271f96a24ad007a5f54b7e22ae49363652eb7356464fcbb09ed",
});
```

#### `writeInteraction`

write an interaction to an `ao` Message Unit `mu`.

```js
import { createDataItemSigner, writeInteraction } from "@permaweb/ao-sdk";

const interactionId = await writeInteraction({
  contractId,
  input,
  signer: createDataItemSigner(wallet),
  tags,
});
```

#### `createContract`

Create a contract, publishing to Arys, then registering it on the Warp Gateway

```js
import { createContract, createDataItemSigner } from "@permaweb/ao-sdk";

const contractId = await createContract({
  srcId,
  initialState,
  signer: createDataItemSigner(wallet),
  tags,
});
```

#### `createDataItemSigner`

`writeInteraction` and `createContract` both require signing a data item with a
wallet.

`createDataItemSigner` is a convenience api that, given a wallet, returns a
function that can be passed to both `writeInteraction` and `createContract` in
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
