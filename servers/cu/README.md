# `ao` Compute Unit

This is an spec compliant `ao` Compute Unit, implemented using NodeJS

<!-- toc -->

- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Debug Logging](#debug-logging)
- [Manually Trigger Checkpointing](#manually-trigger-checkpointing)
- [Project Structure](#project-structure)
  - [Business Logic](#business-logic)
    - [Driven Adapters](#driven-adapters)
    - [Entrypoint](#entrypoint)
  - [Routes](#routes)
    - [Middleware](#middleware)
- [System Requirements](#system-requirements)

<!-- tocstop -->

## Usage

First install dependencies using `npm i`

You will need a `.env` file. A minimal example is provided in `.env.example`.

> Make sure to set the `WALLET` environment variable to the JWK Interface of the
> Arweave Wallet the CU will use.

Then simply start the server using `npm start`.

During development, you can `npm run dev`. This will start a hot-reload process.

Either command will start a server listening on `PORT` (`6363` by default).

## Environment Variables

There are a few environment variables that you can set. Besides `WALLET`/`WALLET_FILE`, they
each have a default:

- `GATEWAY_URL`: The url of the Arweave gateway to use. (Defaults to `https://arweave.net`)

> `GATEWAY_URL` is solely used as a fallback for both `ARWEAVE_URL` and `GRAPHQL_URL`, if not provided (see below).

- `ARWEAVE_URL`: The url for the Arweave http API server, to be used by the CU to fetch
transaction data from Arweave, specifically ao `Modules`, and `Message` `Assignment`s. (Defaults to `GATEWAY_URL`)
- `GRAPHQL_URL`: The url for the Arweave Gateway GraphQL server to be used by the CU. (Defaults to `${GATEWAY_URL}/graphql`)
- `CHECKPOINT_GRAPHQL_URL`: The url for the Arweave Gateway GraphQL server to be used by the CU specifically for querying for Checkpoints, if the default gateway fails. (Defaults to `GRAPHQL_URL`)
- `UPLOADER_URL`: The url of the uploader to use to upload Process `Checkpoints`
  to Arweave. (Defaults to `up.arweave.net`)
- `WALLET`/`WALLET_FILE`: the JWK Interface stringified JSON that will be used by the CU, or a file to load it from
- `PORT`: Which port the web server should listen on (defaults to port `6363`)
- `DB_MODE`: Whether the database being used by the CU is embedded within the CU
  or is remote to the CU. Can be either `embedded` or `remote` (defaults to
  `embedded`)
- `DB_URL`: the name of the embdeeded database (defaults to `ao-cache`)
- `DUMP_PATH`: the path to send `heap` snapshots to. (See
  [Heap Snapshots](#heap-snapshot))
- `PROCESS_WASM_MEMORY_MAX_LIMIT`: The maximum `Memory-Limit`, in bytes,
  supported for `ao` processes (defaults to `1GB`)
- `PROCESS_WASM_COMPUTE_MAX_LIMIT`: The maximum `Compute-Limit`, in bytes,
  supported for `ao` processes (defaults to `9 billion`)
- `WASM_EVALUATION_MAX_WORKERS`: The number of workers to use for evaluating
  messages (Defaults to `3`)
- `WASM_BINARY_FILE_DIRECTORY`: The directory to cache wasm binaries downloaded
  from arweave. (Defaults to the os temp directory)
- `WASM_MODULE_CACHE_MAX_SIZE`: The maximum size of the in-memory cache used for
  Wasm modules (Defaults to `5` wasm modules)
- `WASM_INSTANCE_CACHE_MAX_SIZE`: The maximum size of the in-memory cache used
  for loaded Wasm instances (defaults to `5` loaded wasm instance)
- `PROCESS_CHECKPOINT_FILE_DIRECTORY`: the directory to cache created/found Checkpoints, from arweave,
for quick retrieval later (Defaults to the os temp directory)
- `PROCESS_MEMORY_CACHE_MAX_SIZE`: The maximum size, in bytes, of the LRU
  In-Memory cache used to cache the latest memory evaluated for ao processes.
- `PROCESS_MEMORY_CACHE_TTL`: The time-to-live for a cache entry in the process
  latest memory LRU In-Memory cache. An entries age is reset each time it is
  accessed
- `PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL`: The interval at which the CU should Checkpoint all processes stored in it's cache. Set to `0` to disabled (defaults to `4h`)
- `PROCESS_CHECKPOINT_CREATION_THROTTLE`: The amount of time, in milliseconds,
  that the CU should wait before creating a process `Checkpoint` IFF it has
  already created a Checkpoint for that process, since it last started. This is effectively a throttle
  on `Checkpoint` creation, for a given process (defaults to `30 minutes`)
- `DISABLE_PROCESS_CHECKPOINT_CREATION`: Whether to disable process `Checkpoint`
  creation uploads to Arweave. Set to any value to disable `Checkpoint`
  creation. (You must explicitly enable `Checkpoint` creation by setting -
  `DISABLE_PROCESS_CHECKPOINT_CREATION` to `'false'`)
- `EAGER_CHECKPOINT_THRESHOLD`: If an evaluation stream evaluates this amount of messages, then it will immediately create a Checkpoint at the end of the evaluation stream.
- `MEM_MONITOR_INTERVAL`: The interval, in milliseconds, at which to log memory
  usage on this CU.
- `BUSY_THRESHOLD`: The amount of time, in milliseconds, the CU should wait for a process evaluation stream to complete before sending a "busy" respond to the client (defaults to `0s` ie. disabled). If disabled, this could cause the CU to maintain long-open connections with clients until it completes long process evaluation streams.
- `RESTRICT_PROCESSES`: A list of process ids that the CU should restrict aka. a `blacklist`
- `ALLOW_PROCESSES`: The counterpart to RESTRICT_PROCESSES. When configured the CU will 
   only execute these processes (`whitelist`)

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-cu*`. You can use wildcards to enable a
subset of logs ie. `ao-cu:readState*`

## Manually Trigger Checkpointing

If you'd like to manually trigger the CU to Checkpoint all Processes it has in it's in-memory cache,
you can do so by sending the node process a `SIGUSR2` signal.

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
tested, and exposed via a `index.js` (see [Entrypoint](#entrypoint))

`/domain/lib` contains all of the business logic steps that can be composed into
public apis (ie. `domain/readState.js`, `domain/readResults.js`, and
`domain/readScheduledMessages.js`)

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

All driven adapters are located in `/domain/client`

`domain/client` contains implementations, of the contracts in `dal.js`, for
various platforms. The unit tests for the implementations in `client` also
import contracts from `dal.js` to help ensure that the implementation properly
satisfies the API.

#### Entrypoint

Finally, the entrypoint `/domain/index.js` sets up the appropriate
implementations from `client` and injects them into the public apis.

Anything outside of domain should only ever import from `domain/index.js`.

### Routes

All public routes exposed by the `ao` Compute Unit can be found in `/routes`.
Each route is composed in `/route/index.js`, which is then composed further in
`app.js`, the Fastify server. This is the Driving Adapter.

#### Middleware

This `ao` Compute Unit uses simple function composition to achieve middleware
behavior on routes. This allows for a more idiomatic developer experience -- if
an error occurs, it can simply be thrown, which bubbles and is caught by a
middleware that is composed at the top (see `withErrorHandler.js`).

In fact, our routes don't event import `fastify`, and instead are injected an
instance of `fastify` to mount routes onto.

> `fastify` middleware is still leveraged, it is abstracted away from the
> majority of the developer experience, only existing in `app.js`

Business logic is injected into routes via a composed middleware `withDomain.js`
that attached `config` and business logic apis to `req.domain`. This is how
routes call into business logic, thus completing the Ports and Adapters
Architecture.

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
