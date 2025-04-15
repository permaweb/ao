# `ao` Connect

The `aoconnect` library provides an abstraction for spawning, evaluating, and
interacting with `ao` Processes.

This module will run in a browser or server environment.

- Read the result of an `ao` Message evaluation from a `ao` Compute Unit `cu`
- Send a Message targeting an `ao` Process to an `ao` Message Unit `mu`
- Spawn an `ao` Process, assigning it to an `ao` Scheduler Unit `su`

<!-- toc -->

- [Usage](#usage)
    - [ESM (Node & Browser) aka type: `module`](#esm-node--browser-aka-type-module)
    - [CJS (Node) type: `commonjs`](#cjs-node-type-commonjs)
    - [Usage with Webpack](#usage-with-webpack)
  - [API](#api)
    - [`result`](#result)
    - [`results`](#results)
    - [`message`](#message)
    - [`signMessage`](#signMessage)
    - [`sendSignedMessage`](#sendSignedMessage)
    - [`spawn`](#spawn)
    - [`connect`](#connect)
    - [`monitor`](#monitor)
    - [`dryrun`](#dryrun)
    - [`assign`](#assign)
    - [Environment Variables](#environment-variables)
    - [`createSigner`](#createsigner)
    - [`serializeCron`](#serializecron)
- [Debug Logging](#debug-logging)
- [Testing](#testing)
- [Project Structure](#project-structure)

<!-- tocstop -->

## Usage

This module can be used on the server, as well as the browser:

#### ESM (Node & Browser) aka type: `module`

```js
import { message, result, spawn } from "@permaweb/aoconnect";
```

#### CJS (Node) type: `commonjs`

```js
const { spawn, message, result } = require("@permaweb/aoconnect");
```

The duration of this document will use `ESM` for examples

#### Usage with Webpack

AOConnect by default exposes a file designed to be used in the browser. If
you're using Webpack to bundle an app for the server and are having issues, you
may need to update import statements to point at an implementation for node like
so.

```js
import { createSigner, message } from "@permaweb/aoconnect/node";
```

### API

#### `result`

Read the result of the message evaluation from an `ao` Compute Unit `cu`

```js
import { result } from "@permaweb/aoconnect";

let { Messages, Spawns, Output, Error } = await result({
  message: "l3hbt-rIJ_dr9at-eQ3EVajHWMnxPNm9eBtXpzsFWZc",
  process: "5SGJUlPwlenkyuG9-xWh0Rcf0azm8XEd5RBTiutgWAg",
});
```

#### `results`

Read a batch of results from a process, this feature can be used as a polling
mechanism looking for new results

```js
import { results } from "@permaweb/aoconnect";

let results = await results({
  process: "5SGJUlPwlenkyuG9-xWh0Rcf0azm8XEd5RBTiutgWAg",
  from: cursor,
  sort: "ASC",
  limit: 25,
});
```

Parameters

| Name    | Description                                                       | Optional? |
| ------- | ----------------------------------------------------------------- | --------- |
| process | the process identifier                                            | false     |
| from    | cursor starting point                                             | true      |
| to      | cursor ending point                                               | true      |
| sort    | list results in decending or ascending order, default will be ASC | true      |
| limit   | the number of results to return (default: 25)                     | true      |

#### `message`

Send a message to an `ao` Message Unit `mu` targeting an ao `process`.

```js
import { createSigner, message } from "@permaweb/aoconnect";

const messageId = await message({
  process,
  signer: createSigner(wallet),
  anchor,
  tags,
  data,
});
```

> You can pass a 32 byte `anchor` to `message` which will be set on the DataItem

#### `signMessage`
 
 Prepare and sign an `ao` message which can later be dispatched using `sendSignedMessage`
 
 ```js
 import { createSigner, signMessage } from "@permaweb/aoconnect";
 
 const signedMessage = await signMessage({
   process,
   signer: createSigner(wallet),
   anchor,
   tags,
   data,
 });
 ```
 
 > You can pass a 32 byte `anchor` to `message` which will be set on the DataItem
 
 #### `sendSignedMessage`
 
 Dispatch a previously signed message
 
 ```js
 import { createSigner, sendSignedMessage } from "@permaweb/aoconnect";
 
 const signedMessage = await sendSignedMessage(signedMessage);
 ```

#### `spawn`

Spawn an `ao` process, assigning the `ao` Scheduler to schedule its messages

```js
import { createSigner, spawn } from "@permaweb/aoconnect";

const processId = await spawn({
  module,
  scheduler,
  signer: createSigner(wallet),
  tags,
  data,
});
```

#### `connect`

If you would like the connect to use ao components other than the defaults, you
can specify those components by providing their urls to `connect`. You can
currently specify:

- `GATEWAY_URL`: (currently only used as the default host for `GRAPHQL_URL`)
- `GRAPHQL_URL`: the Arweave GraphQL gateway to use for querying data from
  Arweave. (defaults to `${GATEWAY_URL}/graphql`)
- `GRAPHQL_MAX_RETRIES`: the number of times to retry querying the gateway,
  utilizing an exponential backoff (defaults to `0`)
- `GRAPHQL_RETRY_BACKOFF`: the initial backoff, in milliseconds (moot if
  `GRAPHQL_MAX_RETRIES` is set to `0`) (defaults to `300`)
- `MU_URL`: The Messenger Unit URL
- `CU_URL`: The Compute Unit URL

```js
import { connect } from "@permaweb/aoconnect";

const { spawn, message, result } = connect({
  GATEWAY_URL: "...",
  GRAPHQL_URL: "...",
  GRAPHQL_MAX_RETRIES: 2,
  GRAPHQL_RETRY_BACKOFF: 250,
  MU_URL: "...",
  CU_URL: "...",
});
```

> If `GATEWAY_URL` is set but `GRAPHQL_URL` is _not_ set, then the `GATEWAY_URL`
> provided **MUST** have a `/graphql` endpoint that serves the Arweave Gateway
> GraphQL Server. ie. `https://arweave.net/graphql`

If any value is not provided, a library default will be used. In this sense,
invoking `connect()` with no parameters or an empty object is functionally
equivalent to using the top-lvl exports of the library:

```js
import {
 spawn,
 message,
 result
 connect
} from '@permaweb/aoconnect';

// These are functionally equivalent
connect() == { spawn, message, result }
```

#### `monitor`

When using cron messages, ao users need a way to start injesting the messages,
using this monitor method, ao users can initiate the subscription service for
cron messages.

```js
import { createSigner, monitor } from "@permaweb/aoconnect";

const result = await monitor({
  process,
  signer: createSigner(wallet),
});
```

#### `dryrun`

DryRun is the process of sending a message object to a specific process and
getting the `Result` object back, but the memory is not saved, it is perfect to
create a read message to return the current value of memory. For example, a
balance of a token, or a result of a transfer, etc.

```js
import { createSigner, dryrun } from "@permaweb/aoconnect";

const result = await dryrun({
  process: 'PROCESSID',
  data: '',
  tags: [{name: 'Action', value: 'Balance'},
  anchor: '1234',
  ...rest are optional (Id, Owner, etc)
});

console.log(result.Messages[0]);
```

#### `assign`

Create an Assignment for an `ao` process

```js
import { assign } from "@permaweb/aoconnect";

const processId = await assign({
  process: "process-id",
  message: "message-id",
  exclude: ["Data", "Tags", "etc."], // optional list of DataItem fields to exclude
});
```

Create a Assignment for an `ao` process with an L1 transaction

```js
import { assign } from "@permaweb/aoconnect";

const processId = await assign({
  process: "process-id",
  message: "txid",
  baseLayer: true,
});
```

#### Environment Variables

The library also allows configuring ao components described above, using
environment variables.

On `NodeJS`, you can use `process.env` to set these values.

In the browser, you can use `globalThis` to set these values.

> In both cases, you should set environment variables prior to importing the
> module. If this is not possible, consider using [`connect`](#connect) and
> passing in values from the environment that way.

#### `createSigner`

> `createDataItemSigner` is available for backwards compatibility, but is an
> alias for `createSigner`.

In `mainnet` mode all HTTP Messages and Data Items must be signed.

`createSigner` is a convenience api that, given a wallet, returns a function
that can be passed as `signer` to `connect` in order to properly sign DataItems
and HTTP Signed Messages.

The library provides a browser compatible and node compatible version that you
can use OOTB.

The `browser` compatible versions expects an instance of `window.arweaveWallet`
to be passed to it:

```js
import { createSigner } from "@permaweb/aoconnect";

const signer = createSigner(globalThis.arweaveWallet);
```

The `node` compatible versions expects a JWK interface to be passed to it:

```js
import fs from "node:fs";
import { createSigner } from "@permaweb/aoconnect";

const wallet = JSON.parse(fs.readFileSync(process.env.PATH_TO_WALLET));
const signer = createSigner(wallet);
```

You can also implement your own `signer`, as long as it satisfies the api. Here
is what the API looks like in TypeScript:

```ts
type KeyPublicMeta = {
  publicKey: string;
  alg?: string;
  type?: number;
};

type CreateSignatureData = (key: KeyPublicMeta): Promise<Uint8Array>;

type SignatureDataType = "ans104" | "httpsig";

type SignatureResult = {
  signature: Uint8Array | string;
  address: string;
};

type RawSigner = (
  create: CreateSignatureData,
  type: SignatureDataType,
): Promise<SignatureResult>;
```

`create` will be a function that expects to receive, as its first arugments, an
object that has the following fields:

- `publicKey`: the `publicKey` of the credentials, either as a `Uint8Array`, or
  **base64 URL encoded** `string`.
- `alg` (optional): the algorithm used for signing. If not provided, the default
  is `rsa-pss-sha512` for HTTP Signed Messages and `rsa-v1_5-sha256` for ANS-104
  Data items (these are currently the only supported algorithms)
- `type` (optional): the canonical signature type. If not provided, the default
  is `1` which means `arweave` keys and signature type. (Currently only `1` is
  supported)

The second argument, `type`, in most cases can be ignored, but is provided in
cases where different behavior is desired for signing the signature base of
DataItems vs. HTTP Signed Messages.

In order to construct the data to sign, the `signer` MUST call `create`,
providing it the information described above. `create` will return a Promise
that resolves to a `Uint8Array` that will contain the data to be signed. Once
the signer has signed this data, it should return a `Promise` that resolves to a
`SignatureResult` with the following fields:

- `signature`: the raw bytes of the signature produced, or a **base64 URL
  encoded** `string`
- `address`: be the canonical `address` associated with the credentials.

Note that, in this signing flow, that the private credentials never need to be
known by `aoconnect`. In this way, the actual signing operation may be an opaque
operation -- a black box. Upon receiving the `signature` and `address` from the
signer, `aoconnect` will handle encoding them, along with associated metadata
such as a public key, `alg` and key type, in the proper context: as the
signature in an ANS-104 Data Item, or as a Signature on an HTTP Signed Message.

For example, here is a custom signer where the credentials and signing are
stored remotely in a hypothetical vault service:

```js
import { connect } from 'aoconnect'

const myAwesomeSigner = async (create) => {
  /**
   * First retrieve the public key information,
   * and invoke create to produce the signature base
   */
  const dataToSign = await fetch('https://my.vault.io/.well-known/jwks.json')
    .then((res) => res.json())
    .then(async ([firstKey]) => {
      const publicKey = Buffer.from(firstKey.n, 'base64url')
      return create({ publicKey })
    })

  /**
   * Now sign the data
   */
  return fetch(
    'https://my.vault.io',
    {
      method: 'POST',
      body: dataToSign,
      ...
    }
  ).then(async (res) => ({
    signature: res.headers.get('signature'),
    address: res.headers.get('address')
  }))
}

/**
 * Inject the signer
 */
const { message } = connect({ signer: myAwesomeSigner })
```

#### `serializeCron`

Serialize a Cron Object into Cron Tags.

```js
import { serializeCron } from "@permaweb/aoconnect";

const cron = {
  interval: "10-minutes",
  tags: [
    { name: "Foo", value: "bar" },
    { name: "Bar", value: "foo" },
  ],
};

const tags = serializeCron(cron);
/*
  tags = [
    { name: "Cron-Interval", value: "10-minutes" },
    { name: "Cron-Tag-Foo", value: "bar" },
    { name: "Cron-Tag-Bar", value: "foo" },
  ]
*/
```

> Cron Interval must adhere to the AO Data Protocol

## Debug Logging

You can enable verbose debug logging on the library. All logging is scoped under
the name `@permaweb/aoconnect*`. You can use wildcards to enable a subset of
logs ie. `@permaweb/aoconnect/result*`

For Node, set the `DEBUG` environment variable to the logs you're interested in.

For the Browser, set the `localStorage.debug` variable to the logs you're
interested in.

## Testing

Run `npm test` to run the tests.

Run `npm run test:integration` to run the integration tests.

## Project Structure

The `aoconnect` project loosely implements the
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
