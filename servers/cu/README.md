# `ao` Compute Unit

This is an spec compliant `ao` Compute Unit, implemented as a Node Express
Server.

<!-- toc -->

- [Getting Started](#getting-started)
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

<!-- tocstop -->

## Getting Started

> For ease of development, this Compute Unit will use an embedded PouchDB, by default, when starting in development mode

## Usage

First install dependencies using `npm i`

Then simply start the server using `npm start` or `npm run dev` if you are
working on the project locally. This will start a hot-reload process listening
on port `3005` by default.

## Environment Variables

There are a few environment variables that you can set:

- `GATEWAY_URL`: Which Arweave Gateway to use (defaults to `arweave.net` in
  development mode)
- `WALLET`: the JWK Interface stringified JSON that will be used by the CU
- `PORT`: Which port the web server should listen on (defaults to port `3005`)
- `DB_MODE`: the database mode to run the service in. Can be either `embedded` or `remote` (defaults to `embedded` during development)
- `DB_URL`: The connection string to the database (when using `DB_MODE=embedded`, defaults to `ao-cache`)
- `DB_MAX_LISTENERS`: the maximum number of event listeners for DB events.
  Defaults to `100`
- `DUMP_PATH`: the path to send `heap` snapshots to. (See
  [Heap Snapshots](#heap-snapshot))

### Running With CouchDB

This Compute Unit can be ran using a remote CouchDB. Simply set set `DB_MODE=remote` and `DB_URL` to the CouchDB connection string.

You will need a CouchDB database running. For convenience, a CouchDB
`Dockefile` and configuration is included in the `.couchdb` directory that you
can use to spin up a local Postgres instance

> The `.couchdb` directory is purely a convenience for local development

> If you use Gitpod, this is already done for you, as part of spinning up a new
> workspace

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

This will start a CouchDB database listening on port `5432` with credentials in
the `./couchdb/couchdb.conf` file

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Web Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-cu*`. You can use wildcards to enable a
subset of logs ie. `ao-cu:readState*`

## Heap Snapshot

The `ao` Compute Unit is a Memory Intensive application. It must continuously:

- Load WASM modules, allocating memory for the internal WASM heap
- Persist `ao` BiBo buffers, buffering them fully into memory
- Load arbitrary amounts of sequenced messages from a Sequencer Unit
- Generate arbitrary amounts of scheduled messages
- Evaluate `ao` messages passing raw state in and out using BiBo

Each of these tasks have a non-trivial memory footprint, and we do our best to
predictably utilize memory. A large part of this is the use of Streams which
have a more predictable memory footprint, and properly handle backpressure to
prevent any one process from hogging all of the resources (aka noisy neighbor),
as well as being able to handle lengthy evaluations without loading all of the
messages into memory at once.

Regardless, we sometimes may need to peer into the memory usage of the process.
This Compute Unit supports exporting a snapshot of it's current heap. That snap
shot can then be downloaded from the CU at the root.

First, obtain the process id for the CU process:

```sh
pgrep node
```

Once you have the process id, you can initiate a heap dump using
`npm run heapdump -- <pid>`. This will synchronously place a heap snapshot in
the `DUMP_PATH` and print the name of the snapshot to the console. Then download
the snapshot from `https://<cu_host>/<snapshot_name>`

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

Finally, the entrypoint
`/domain/index.js choosing the appropriate implementations from`client` and
injecting them into the public apis.

Anything outside of domain should only ever import from `domain/index.js`.

### Routes

All public routes exposed by the `ao` Compute Unit can be found in `/routes`.
Each route is composed in `/route/index.js`, which is then composed further in
`app.js`, the Express server. This is the Driving Adapter.

#### Middleware

In lieu of using `express` middleware api, which is specific to `express` and
not so ergonomic for JS developers, this `ao` Compute Unit uses simple function
composition to achieve middleware behavior on routes. This allows for a more
idiomatic developer experience -- if an error occurs, it can simply be thrown,
which bubbles and is caught by a middleware that is composed at the top (see
`withErrorHandler.js`). This is in contrast to using `express` `next` middleware
paradigm which is clunky and not very ergonomic, and does catch bubbled errors.

In fact, our routes don't event import `express`, and instead are injected an
instance of `express` to mount routes onto.

> `express` middleware is still leveraged, it is abstracted away from the
> majority of the developer experience, only existing in `app.js`

Business logic is injected into routes via a composed middleware `withDomain.js`
that attached `config` and business logic apis to `req.domain`. This is how
routes call into business logic, thus completing the Ports and Adapters
Architecture.
