# `aorc`!

This is an example of a simple `ao` Relayer Process called `aorc`. It implements
3 functions:

- `sub` (`ao-action`: `write`): Subscribes the caller to the relayer.
- `unsub` (`ao-action`: `write`): Unsubscribes the caller from the relayer
- `relay` (`ao-action`: `write`): Relays a message to the `subscribers` in the `subs` table.

<!-- toc -->

- [Getting Started](#getting-started)
- [Contributing](#contributing)

<!-- tocstop -->

## Getting Started

First install dependencies using `npm i`

If you'd like to simply interact with the process, there is a `repl.js` that you
can start and send messages to the process, locally. Just run `node repl.js`

Here are some example messages:

Subscribe to the relayer

```sh
aorc > sub
```

Unsubscribe from the relayer

```sh
aorc > unsub
```

Relay a message

```sh
hello world > relay
```

## Contributing

If you modify the `process.lua` make sure to build and publish the source using
the `ao` CLI.
