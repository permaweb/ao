# `ao` Compute Unit

This is an spec compliant `ao` Compute Unit, implemented using NodeJS

<!-- toc -->

- [Prerequisites](#prerequisites)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Logging](#logging)
  - [Dynamically Change the Log Level](#dynamically-change-the-log-level)
- [Manually Trigger Checkpointing](#manually-trigger-checkpointing)
- [Project Structure](#project-structure)
  - [Business Logic](#business-logic)
    - [Driven Adapters](#driven-adapters)
    - [Driving Adapter](#driving-adapter)
      - [Routes](#routes)
        - [Route Middleware](#route-middleware)
    - [Entrypoint](#entrypoint)
- [System Requirements](#system-requirements)

<!-- tocstop -->

## Prerequisites

You will need Node `>=18` installed. If you use `nvm`, then simply run
`nvm install`, which will install Node `22`

> In order to use wasm 64 with more 4GB of process memory, you will need to use
> Node `22`

## Usage

First install dependencies using `npm i`

You will need a `.env` file. A minimal example is provided in `.env.example`.

> Make sure to set the `WALLET` environment variable to the JWK Interface of the
> Arweave Wallet the CU will use.

Then simply start the server using `npm start`.

During development, you can `npm run dev`. This will start a hot-reload process.

Either command will start a server listening on `PORT` (`6363` by default).

## Environment Variables

There are a few environment variables that you can set. Besides
`WALLET`/`WALLET_FILE`, they each have a default:

- `GATEWAY_URL`: The url of the Arweave gateway to use. (Defaults to
  `https://arweave.net`)

> `GATEWAY_URL` is solely used as a fallback for both `ARWEAVE_URL` and
> `GRAPHQL_URL`, if not provided (see below).

- `ARWEAVE_URL`: The url for the Arweave http API server, to be used by the CU
  to fetch transaction data from Arweave, specifically ao `Modules`, and
  `Message` `Assignment`s. (Defaults to `GATEWAY_URL`)
- `GRAPHQL_URL`: The url for the Arweave Gateway GraphQL server to be used by
  the CU. (Defaults to `${GATEWAY_URL}/graphql`)
- `CHECKPOINT_GRAPHQL_URL`: The url for the Arweave Gateway GraphQL server to be
  used by the CU specifically for querying for Checkpoints, if the default
  gateway fails. (Defaults to `GRAPHQL_URL`)
- `UPLOADER_URL`: The url of the uploader to use to upload Process `Checkpoints`
  to Arweave. (Defaults to `up.arweave.net`)
- `WALLET`/`WALLET_FILE`: the JWK Interface stringified JSON that will be used
  by the CU, or a file to load it from
- `PORT`: Which port the web server should listen on (defaults to port `6363`)
- `ENABLE_METRICS_ENDPOINT`: Whether the OpenTelemetry endpoint `/metrics`
  should be enabled. Set to any value to enable. (defaults to disabled)
- `DB_MODE`: Whether the database being used by the CU is embedded within the CU
  or is remote to the CU. Can be either `embedded` or `remote` (defaults to
  `embedded`)
- `DB_URL`: the name of the embdeeded database (defaults to `ao-cache`)
- `PROCESS_WASM_MEMORY_MAX_LIMIT`: The maximum `Memory-Limit`, in bytes,
  supported for `ao` processes (defaults to `1GB`)
- `PROCESS_WASM_COMPUTE_MAX_LIMIT`: The maximum `Compute-Limit`, in bytes,
  supported for `ao` processes (defaults to `9 billion`)
- `PROCESS_WASM_SUPPORTED_FORMATS`: the wasm module formats that this CU
  supports, as a comma-delimited string (defaults to
  `['wasm32-unknown-emscripten', 'wasm32-unknown-emscripten2']`)
- `PROCESS_WASM_SUPPORTED_EXTENSIONS`: the wasm extensions that this CU
  supports, as a comma-delimited string (defaults to no extensions)
- `WASM_EVALUATION_MAX_WORKERS`: The number of workers to use for evaluating
  messages (Defaults to `os.cpus() - 1`)
- `WASM_BINARY_FILE_DIRECTORY`: The directory to cache wasm binaries downloaded
  from arweave. (Defaults to the os temp directory)
- `WASM_MODULE_CACHE_MAX_SIZE`: The maximum size of the in-memory cache used for
  Wasm modules (Defaults to `5` wasm modules)
- `WASM_INSTANCE_CACHE_MAX_SIZE`: The maximum size of the in-memory cache used
  for loaded Wasm instances (defaults to `5` loaded wasm instance)
- `PROCESS_MEMORY_CACHE_MAX_SIZE`: The maximum size, in bytes, of the LRU
  In-Memory cache used to cache the latest memory evaluated for ao processes.
- `PROCESS_MEMORY_CACHE_TTL`: The time-to-live for a cache entry in the process
  latest memory LRU In-Memory cache. An entries age is reset each time it is
  accessed
- `PROCESS_MEMORY_CACHE_FILE_DIR`:The directory to store process memory that has
  been drained from the LRU In-Memory cache (not to be conflated with file
  checkpoints -- see below) (Defaults to the os temp directory)
- `PROCESS_MEMORY_FILE_CHECKPOINTS_DIR`: The directory to store process memory
  associated with file checkpoints. Process file checkpoints will persist across
  CU restarts (defaults to os tmp directory `/file_checkpoints`)
- `PROCESS_MEMORY_CACHE_FILE_DIR`: The directory to store drained process memory
  (Defaults to the os temp directory)
- `PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL`: The interval at which the CU
  should Checkpoint all processes stored in it's cache. Set to `0` to disabled
  (defaults to `0`)
- `PROCESS_CHECKPOINT_CREATION_THROTTLE`: The amount of time, in milliseconds,
  that the CU should wait before creating a process `Checkpoint` IFF it has
  already created a Checkpoint for that process, since it last started. This is
  effectively a throttle on `Checkpoint` creation, for a given process (defaults
  to `30 minutes`)
- `DISABLE_PROCESS_CHECKPOINT_CREATION`: Whether to disable process `Checkpoint`
  creation uploads to Arweave. Set to any value to disable `Checkpoint`
  creation. (You must explicitly enable `Checkpoint` creation by setting -
  `DISABLE_PROCESS_CHECKPOINT_CREATION` to `'false'`)
- `DISABLE_PROCESS_FILE_CHECKPOINT_CREATION`: Where to disable process
  `Checkpoint` creation to the file system. (You must explicitly enable
  `Checkpoint` creation by setting - `DISABLE_PROCESS_FILE_CHECKPOINT_CREATION`
  to `'false'`)
- `EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD`: If a process uses this amount of
  gas, then it will immediately create a Checkpoint at the end of the evaluation
  stream.
- `MEM_MONITOR_INTERVAL`: The interval, in milliseconds, at which to log memory
  usage on this CU.
- `BUSY_THRESHOLD`: The amount of time, in milliseconds, the CU should wait for
  a process evaluation stream to complete before sending a "busy" respond to the
  client (defaults to `0s` ie. disabled). If disabled, this could cause the CU
  to maintain long-open connections with clients until it completes long process
  evaluation streams.
- `RESTRICT_PROCESSES`: A list of process ids that the CU should restrict aka. a
  `blacklist` (defaults to none)
- `ALLOW_PROCESSES`: The counterpart to RESTRICT_PROCESSES. When configured the
  CU will only execute these processes aka. a `whitelist` (defaults to allow all
  processes)
- `ALLOW_OWNERS`: A list of process owners, whose processes are allowed to
  execute on the CU aka. an owner `whitelist` (defaults to allow all owners)
- `PROCESS_CHECKPOINT_TRUSTED_OWNERS`: A list of wallets whose checkpoints are
  trusted and the CU can start from
- `DEFAULT_LOG_LEVEL`: the logging level to use (defaults to `debug`)
- `LOG_CONFIG_PATH`: the path to the file used to dynamically set the logging
  level (see [here](#dynamically-change-the-log-level))

## Tests

You can execute unit tests by running `npm test`

## Logging

The CU uses logging levels that conform to the severity semantics specified by
RFC5424:

> severity of all levels is assumed to be **numerically ascending from most
> important to least important**.

The CU uses these logging levels:

```js
{
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}
```

You can set your desired logging level by setting the `DEFAULT_LOG_LEVEL`
environment variable.

### Dynamically Change the Log Level

If you'd like to dynamically change the log level on a running CU, you may set
the desired level in a `.loglevel` file in the working directory. The CU will
automatically adjust its logging level accordingly, for all new logs.

If the `.loglevel` file does not exist, is empty, the logging level will be
reset to the `DEFAULT_LOG_LEVEL`.

> You can also specify the `LOG_CONFIG_PATH` environment variable to configure a
> different file to use for dynamically setting the log level

## Manually Trigger Checkpointing

If you'd like to manually trigger the CU to Checkpoint all Processes it has in
it's in-memory cache, you can do so by sending the node process a `SIGUSR2`
signal.

First, obtain the process id for the CU:

```sh
pgrep node
# or
lsof -i $PORT
```

Then send a `SIGUSR2` signal to that process: `kill -USR2 <process>`

## Project Structure

This `ao` Compute Unit project loosely implements the
[Ports and Adapters](https://medium.com/idealo-tech-blog/hexagonal-ports-adapters-architecture-e3617bcf00a0)
Architecture.

```
Driving Adapter <--> [Port(Business Logic)Port] <--> Driven Adapter
```

### Business Logic

All business logic is in `src/domain` where each public api is implemented,
tested, and exposed via a `domain/api/*.js`

`domain/lib` contains all of the business logic steps that can be composed into
public apis (ie. `apis/readState.js`, `apis/readResults.js`)

`dal.js` contains the contracts for the driven adapters aka side-effects.
Implementations for those contracts are injected into, then parsed and invoked
by, the business logic. This is how we inject specific integrations with other
`ao` components and providers while keeping them separated from the business
logic -- the business logic simply consumes a black-box API -- making them easy
to stub, and business logic easy to unit tests for correctness.

Because the contract wrapping is done by the business logic itself, it also
ensures the stubs we use in our unit tests accurately implement the contract
API. Thus our unit tests are simoultaneously contract tests.

#### Driven Adapters

All driven adapters are located in `effects`

`effects` contains implementations, of the contracts in `dal.js`, for various
platforms. The unit tests for the implementations in `effects` also import
contracts from `domain/dal.js` to help ensure that the implementation properly
satisfies the API.

#### Driving Adapter

All driving adapters, which is to say the public API, are also located in
effects.

The driving adapter is responsible for receving `domain` and returning an
interface to `start` and `stop` the application. The driving adapter is
responsible for injecting the `domain` into whereever it needs to, from the
public API it exposes.

##### Routes

All public routes are provided by the driving Adapter. For example, the
`effects/ao-http` adapter exposes a public API that can be consumed over HTTP
and whose interface is understood by other AO units.

###### Route Middleware

This `ao-http` driving adapter uses simple function composition to achieve middleware
behavior on Driving adapter routes. This allows for a more idiomatic developer
experience -- if an error occurs, it can simply be thrown, which bubbles and is
caught by a middleware that is composed at the top.

In fact, our routes don't event import `fastify`, and instead are injected an
instance of `fastify` to mount routes onto.

> `fastify` middleware is still leveraged, it is abstracted away from the
> majority of the developer experience, only existing in `app.js`

#### Entrypoint

Finally, the entrypoint `app.js` builds the appropriate effects based on the
`UNIT_MODE`, then passes those effects into `domain/index.js` that will then
bootstrap the application. `app.js` then starts the application, thus completing
the Ports and Adapters Architecture.

## System Requirements

The `ao` Compute Unit Server is a stateless application, and can be deployed to
any containerized environment using its `Dockerfile` or using `node` directly.

> Make sure you set the `WALLET` environment variable so that is available to
> the CU runtime.

It will need to accept ingress from the Internet over `HTTP(S)` in order to
fulfill incoming requests, and egress to other `ao` Units over `HTTP(S)`.

It will also need some sort of file system available, whether it be persistent
or ephemeral.

So in summary, this `ao` Compute Unit system requirments are:

- a Containerization Environment or `node` to run the application
- a Filesystem to store files and an embedded database
- an ability to accept Ingress from the Internet
- an ability to Egress to other `ao` Units and to the Internet
