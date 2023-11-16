# `ao` Compute Unit

This is an spec compliant `ao` Compute Unit, implemented as a Node Express
Server.

<!-- toc -->

- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Debug Logging](#debug-logging)
- [Heap Snapshot](#heap-snapshot)

<!-- tocstop -->

## Usage

First install dependencies using `npm i`

Then simply start the server using `npm start` or `npm run dev` if you are
working on the project locally. This will start a hot-reload process listening
on port `3005` by default.

## Environment Variables

There are a few environment variables that you can set:

- `GATEWAY_URL`: Which Arweave Gateway to use (defaults to `arweave.net` in
  development mode)
- `SEQUENCER_URL`: Which Sequencer to use (defaults to the `Warp` Gateway in
  development mode)
- `PORT`: Which port the web server should listen on (defaults to port `3005`)
- `DB_PATH`: where on the local filesystem to place the PouchDB, which is used
  for persistence. Defaults to `./ao-cache`
- `DB_MAX_LISTENERS`: the maximum number of event listeners for DB events.
  Defaults to `100`
- `DUMP_PATH`: the path to send `heap` snapshots to. (See
  [Heap Snapshots](#heap-snapshot))

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
ps aux | grep 'src/app.js'
```

Once you have the process id, you can initiate a heap dump using
`npm run heapdump -- <pid>`. This will synchronously place a heap snapshot in
the `DUMP_PATH` and print the name of the snapshot to the console. Then download
the snapshot from `https://<cu_host>/<snapshot_name>`
