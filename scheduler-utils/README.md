# `ao` Scheduler Utils

The `ao` Scheduler Utils provides an abstraction for retrieving the location of an `ao` Process' Scheduler,
and checking whether a wallet is a valid `ao` Scheduler

This sdk will run in a browser or server environment.

<!-- toc -->

- [Usage](#usage)
    - [ESM (Node & Browser) aka type: `module`](#esm-node--browser-aka-type-module)
    - [CJS (Node) type: `commonjs`](#cjs-node-type-commonjs)
  - [API](#api)
    - [`locate`](#locate)
    - [`validate`](#validate)
    - [`raw`](#raw)
    - [Internal Cache](#internal-cache)
    - [`connect`](#connect)
    - [Errors](#errors)

<!-- tocstop -->

## Usage

This module can be used on the server, as well as the browser:

#### ESM (Node & Browser) aka type: `module`

```js
import { locate, validate, raw } from "@permaweb/ao-scheduler-utils";
```

#### CJS (Node) type: `commonjs`

```js
const { locate, validate, raw } = require("@permaweb/ao-scheduler-utils");
```

The duration of this document will use `ESM` for examples

### API

#### `locate`

Locate the `ao` Scheduler assigned to an `ao` Process.

```js
import { locate } from "@permaweb/ao-scheduler-utils";

let { url, address } = await locate('<process-id>');
```

If you already know the `Scheduler` used by the process, you can provide it as a second parameter to `locate` as `schedulerHint`:

```js
import { locate } from "@permaweb/ao-scheduler-utils";

let { url, address } = await locate('<process-id>', 'scheduler-owner-id');
```

This will skip querying the gateway for the process, in order to obtain it's `Scheduler` tag, and instead will directly query for the `Scheduler-Location` record.

> This is useful when a process has just been spawned, so might not be indexed by the gateway yet.


#### `validate`

Check whether the wallet address is a valid `ao` Scheduler

```js
import { validate } from "@permaweb/ao-scheduler-utils";

const isValid = validate('<wallet-address>')
```

#### `raw`

Return the url in the `Scheduler-Location` record for the given wallet address

```js
import { raw } from "@permaweb/ao-scheduler-utils";

const { url } = raw('<wallet-address>')
```

#### Internal Cache

The library maintains an internal in-memory LRU cache of `Scheduler-Location` `Url`s, caching each for their
specified `Time-To-Live`. If a `Scheduler-Location` exists in the cache, it's value will be returned, instead
of fetching the record on chain.

The default size of the cache is `100`. If you'd like a smaller or larger cache, you can set the size using `connect`

#### `connect`

If you would like to use config other than the defaults, you can
specify those coonfigurations by providing their values `connect`. You can currently specify

- The `GRAPHQL_URL`
- The In-Memory `cacheSize`
- Following Redirects `followRedirects`, a boolean that optimizes scheduler routing if `true`
- `GRAPHQL_MAX_RETRIES`, the maximum amount of retries for failed gateway queries
- `GRAPHQL_RETRY_BACKOFF`, the initial delay for a gateway query retry. Doubled for each successive retry

> If you'd like to use no In-Memory Cache, and load the record from chain every time, then set the `cacheSize` to `0`

```js
import { connect } from "@permaweb/ao-scheduler-utils";

const { validate, locate, raw } = connect({
  GRAPHQL_URL: "...",
  cacheSize: 1000,
  followRedirects: true,
  GRAPHQL_MAX_RETRIES: 0,
  GRAPHQL_RETRY_BACKOFF: 300
});
```

If any configuration value is not provided, a default will be used. In this sense, invoking
`connect()` with no parameters or an empty object is functionally equivalent to
using the top-lvl exports of the library:

```js
import {
 locate,
 validate,
 raw,
 connect
} from "@permaweb/ao-scheduler-utils";

// These are functionally equivalent
connect() == { validate, locate, raw }
```

#### Errors

This module's APIs will reject with certain `Error`s for certain sad-paths:

- `TransactionNotFoundError` - the transaction id provided can not be found on the gateway. It's `name` property will be `TransactionNotFound`
- `SchedulerTagNotFoundError` - a `Scheduler` tag was not found on the provided process transaction id. It's `name` property will be `SchedulerTagNotFound`
- `InvalidSchedulerLocationError` - the `Scheduler-Location` record retrieved does not adhere to the `ao` `Scheduler-Location` specification. It's `name` property will be `InvalidSchedulerLocation`:
  - It does not have a `Url` tag
  - It does not have a `Time-To-Live` tag
 
You can check for these errors in your code, and handle according to your use-case:

```js
import { locate, TransactionNotFoundError } from "@permaweb/ao-scheduler-utils";

await locate('<process-id>')
  .catch((err) => {
    if (err instanceof TransactionNotFoundError) // using instanceof
    if (err.name === 'TransactionNotFound') // use a static string

    throw err // bubble unknown error
  })

```
