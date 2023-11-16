# Hello `ao`!

This is an example of a simple `ao` Process called `hello-world`. It implements
5 functions:

- `hello` (`ao-action`: `write`): updates the internal state for `heardHello` to
  `true`, and also increments the `helloCount` internal state
- `world` (`ao-action`: `write`): updates the internal state for `heardWorld` to
  `true`
- `raw` (`ao-action`: `read`): return the internal process state, as stringfied
  JSON in `output`
- `say` (`ao-action`: `read`): return the value of the transaction pointed to by
  `ao-load` as stringified JSON in `output`
- `friend` (`ao-action`: `write`): return a spawn in result.spawns with the value
  of the tag sent in `src-id` in its `Contract-Src` tag output to be spawned by a mu

This is a simple process that can be used to see some of the core functionality
of `ao`:

- Scheduled Messages
- Persistent Internal State
- Data Loading from Arweave
- Spawning a process from within a process

<!-- toc -->

- [Getting Started](#getting-started)
- [Your own Process](#your-own-process)
- [Contributing](#contributing)

<!-- tocstop -->

## Getting Started

First install dependencies using `npm i`

If you'd like to simply interact with the process, there is a `repl.js` that you
can start and send messages to the process, locally. Just run `node repl.js`

Here are some example messages:

Say Hello to the Process

```sh
hello world > hello
```

Say World to the Process

```sh
hello world > world
```

Ask the Process for it's raw state

```sh
hello world > raw
```

Ask the Process to say something stored on a transaction on Arweave

```sh
hello world > say bomIi0Xivq4sMA1fwAlq6nsloj1H-8qpw6oQooKDWco
```

> `bomIi0Xivq4sMA1fwAlq6nsloj1H-8qpw6oQooKDWco` actually works! But you can
> replace it with any transaction that contains text

Return a spawn with an input src id as its Contract-Src tag

```sh
hello world > friend V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs
```

## Your own Process

There are convenient scripts included that you can run to spin up your own
`hello-world` Process. The current source is already published to
`QU75imHrJN1bOnzlLvLVXiVcSr1EQgA4aLCQG5tvklY`.

> Make sure to set `PATH_TO_WALLET` environment variable to the path to a wallet
> JWK file

`spawnProcess.js` will spawn a new process with the current source. It also adds
a `Scheduled-Message` to be sent every hour, that simply says `hello` to the
process. The `processId` will logged to the console.

`sendMessage.js` will send a `raw` message to the process. The `messageId` will
be logged to the console.

> In addition to `PATH_TO_WALLET`, you also need to set `PROCESS_ID` to the
> process you'd like to send a message to.

`sendLoadMessage.js` will send a `say` message to the process.
`bomIi0Xivq4sMA1fwAlq6nsloj1H-8qpw6oQooKDWco` is hardcoded, but you can change
it any tx on arweave that contains text. The `messageId` will be logged to the
console.

> In addition to `PATH_TO_WALLET`, you also need to set `PROCESS_ID` to the
> process you'd like to send a message to.

`sendSpawnMessage.js` will send a `friend` message to the process.
and spawn a contract with the hello-world source code

> In addition to `PATH_TO_WALLET`, you also need to set `PROCESS_ID` to the
> process you'd like to send a message to.

`readResult.js` will read the result of the `MESSAGE_ID` from an `ao` Compute
Unit and print the result to the console.

> Make sure to set `MESSAGE_ID` to the message you'd like the result for.

## Contributing

If you modify the `process.lua` make sure to build and publish the source using
the `ao` CLI, and update the `srcId` in `spawnProcess.js` and the comment at the
top of `process.lua`.
