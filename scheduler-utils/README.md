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

let { url, owner } = await locate('<process-id>');
```

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

- The `GATEWAY_URL`
- The In-Memory `cacheSize`

> If you'd like to use no In-Memory Cache, and load the record from chain every time, then set the `cacheSize` to `0`

```js
import { connect } from "@permaweb/ao-scheduler-utils";

const { validate, locate, raw } = connect({
  GATEWAY_URL: "...",
  cacheSize: 1000
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
