# ao - The decentralized computer with infinite threads.

`ao` takes a messaging based approach to interoperability with smartweave
contracts. Having a decentralized deterministic execution environment is a
challenge. Interoperability is a requirement for execution environments, we want
to build small units of logic that focuses on their state, these units of logic
are called "smart contracts", but we think of them as processes. These processes
can only mutate or modify their state and no one else can change their state
unless the call the process. But these processes need to interact with other
processes. How?

Message passing, each process has a handle input function that receives messages
from other processes, the process handles that function and has the ability to
send messages via an outbox. A lot like we think of email, each of our email
clients can receive messages, we can process the message and the completion of
that action could result in a new state and/or new outbound messages to other
processes. As those processes receive the messages, they process and modify
their state with a potential result of one or more messages to one or more
processes.

This system enables each process/contract to exist in isolation while
communicating with the rest of the environment, if a process/contract is not
available, the system can spawn that process/contract and then submit the
message.

<!-- toc -->

- [Getting Started](#getting-started)
- [Design Documents](#design-documents)
- [Projects](#projects)
- [Contributing](#contributing)
- [License](#license)

<!-- tocstop -->

## Getting Started

> If you use Gitpod, this is all done for you, when spinning up a new workspace

This project uses `npm` to manage repo-wide dependencies, such as
styling/linting tools, and the toolchain to enforce them as part of committing
code.

First, run `npm i` at the root to install those dependencies.

## Design Documents

- [Design](./design)

## Projects

- [`ao` CLI](./dev-cli): The `ao` Command Line Interface that can be installed
  on the command line and used to initialize, build, run, and publish `ao` Lua
  -> WASM Contracts
- [`ao` JS Loader](./loader): The `ao` JavaScript Loader that enabled invoking
  an `ao` Contract, built into WASM, from a JavaScript context.
- [`ao` JS SDK](./sdk): The `ao` JavaScript SDK that can be used in Node and
  Browser environment to interact and manage `ao` components
- [`ao` Compute Unit (`cu`)](./servers/cu): An implementation of the `ao`
  Compute Unit, aka a `cu` (pronounced "koo" 🦘)
- [`ao` Messenger Unit (`mu`)](./servers/mu): An implementation of the `ao`
  Messaenger Unit, aka a `mu` (pronounced "moo" 🐄)
- [`ao` Sequencer Unit (`su`)](./servers/su): An implementation of the `ao`
  Sequencer Unit, aka a `su` (pronounced "soo" 👧)
- [`ao` Lua Examples](./lua-examples): Various examples of projects leveraging
  `ao` Contracts and components.

## Contributing

SEE [CONTRIBUTING](CONTRIBUTING.md)

## License

SEE [LICENSE](LICENSE)
