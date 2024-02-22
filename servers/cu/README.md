# `ao` Compute Unit

This is an spec compliant `ao` Compute Unit, implemented using NodeJS

<!-- toc -->

- [Usage](#usage)
- [Environment Variables](#environment-variables)
  - [Running With CouchDB](#running-with-couchdb)
- [Tests](#tests)
- [Debug Logging](#debug-logging)
- [Heap Snapshot](#heap-snapshot)
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

There are a few environment variables that you can set. Besides `WALLET`, they
each have a default:

- `GATEWAY_URL`: The Arweave gateway for the CU to use fetch block metadata,
  data on arweave, and Scheduler-Location data (defaults to `arweave.net`)
- `UPLOADER_URL`: The url of the uploader to use to upload Process `Checkpoints`
  to Arweave. (Defaults to `up.arweave.net`)
- `WALLET`: the JWK Interface stringified JSON that will be used by the CU
- `PORT`: Which port the web server should listen on (defaults to port `6363`)
- `DB_MODE`: Whether the database being used by the CU is embedded within the CU
  or is remote to the CU. Can be either `embedded` or `remote` (defaults to
  `embedded`)
- `DB_URL`: The connection string to the database (when using
  `DB_MODE=embedded`, defaults to `ao-cache`)
- `DB_MAX_LISTENERS`: the maximum number of event listeners for DB events.
  Defaults to `100`
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
- `PROCESS_MEMORY_CACHE_MAX_SIZE`: The maximum size, in bytes, of the LRU
  In-Memory cache used to cache the latest memory evaluated for ao processes.
- `PROCESS_MEMORY_CACHE_TTL`: The time-to-live for a cache entry in the process
  latest memory LRU In-Memory cache. An entries age is reset each time it is
  accessed
- `PROCESS_CHECKPOINT_CREATION_THROTTLE`: The amount of time, in milliseconds,
  that the CU should wait before creating a process `Checkpoint` IF it has
  already created a Checkpoint for that process. This is effectively a throttle
  on `Checkpoint` creation, for a given process
- `DISABLE_PROCESS_CHECKPOINT_CREATION`: Whether to disable process `Checkpoint`
  creation uploads to Arweave. Set to any value to disable `Checkpoint`
  creation. (You must explicitly enable `Checkpoint` creation by setting -
  `DISABLE_PROCESS_CHECKPOINT_CREATION` to `'false'`)
- `MEM_MONITOR_INTERVAL`: The interval, in milliseconds, at which to log memory
  usage on this CU.

### Running With CouchDB

This Compute Unit can be ran using a CouchDB as it's persistence layer. Simply
set set `DB_MODE=remote` and `DB_URL` to the CouchDB connection string.

Of course, you will need a CouchDB database running. For development
convenience, a CouchDB `Dockerfile` and configuration is included in the
`.couchdb` directory that you can use to spin up a CouchDB instance.

First, build the image by running this at the root of the `mu` module:

```sh
docker build -t cu-couchdb .couchdb
```

Then start up a container using that image. You can optionally mount a local
directory for CouchDB to store persistent data ie. `/workspace/cu-data`

```sh
mkdir -p /workspace/cu-data
docker run -it \
  -p 5984:5984 \
  -v /workspace/cu-data:/opt/couchdb/data \
  --env-file servers/cu/.couchdb/couchdb.conf \
  cu-couch
```

This will start a CouchDB database listening on port `5984` with credentials in
the `./couchdb/couchdb.conf` file

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-cu*`. You can use wildcards to enable a
subset of logs ie. `ao-cu:readState*`

## Heap Snapshot

The `ao` Compute Unit is a Compute and Memory Intensive application. It must
continuously:

- Load Web Assembly Modules, alloating spaces for the compiled binaries, as well
  as Web Assembly Instance Heaps.
- Cache `ao` Process memory
- Load arbitrary amounts of Scheduled Messages from `ao` Scheduler Units
- Generate arbitrary amounts of Cron Messages
- Evaluate arbitrary length streams of messages flowing into an `ao` Process.

Each of these tasks have a non-trivial memory and compute footprint, and the
implementation tries its best to predictably utilize resources.

This implementation heavily utilizes `streams` which have a more predictable
memory footprint, can properly handle backpressure to prevent any one evaluation
stream from hogging all of the resources (aka noisy neighbor), and handling
evaluation streams of arbitrary length, without having to load all of the
messages into memory, at once.

Regardless, you sometimes may need to peer into the memory usage of the Server.
This Compute Unit supports exporting a snapshot of it's current heap.

First, obtain the process id for the CU:

```sh
pgrep node
# or
lsof -i $PORT
```

Once you have the process id, you can initiate a heap dump using
`npm run heapdump -- <pid>`. This will synchronously place a heap snapshot in
the `DUMP_PATH` and print the name of the snapshot to the console.

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
If running with CouchDB, it will also need a CouchDB database.

> Make sure you set the `WALLET` environment variable so that is available to
> the CU runtime.

It will need to accept ingress from the Internet over `HTTP(S)` in order to
fulfill incoming requests, and egress to other `ao` Units over `HTTP(S)`.

It will also need some sort of file system available, whether it be persistent
or ephemeral.

So in summary, this `ao` Compute Unit system requirments are:

- a Containerization Environment or `node` to run the application
- a CouchDB Database
- a Filesystem
- an ability to accept Ingress from the Internet
- an ability to Egress to other `ao` Units and to the Internet
