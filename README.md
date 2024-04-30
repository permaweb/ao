<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./logos/ao_pictograph_darkmode.svg">
  <source media="(prefers-color-scheme: light)" srcset="./logos/ao_pictograph_lightmode.svg">
  <img alt="logo">
</picture>

# ao - Hyper. Parallel. Compute.

## What is `ao`?

The `ao` computer is the
[actor oriented](https://en.wikipedia.org/wiki/Actor_model) machine that emerges
from the network of nodes that adhere to its core data protocol, running on the
[Arweave](https://arweave.org) network. This document gives a brief introduction
to the protocol and its functionality, as well as its technical details, such
that builders can create new implementations and services that integrate with
it.

The `ao` computer is a single, unified computing environment (a
[Single System Image](https://en.wikipedia.org/wiki/Single_system_image)),
hosted on a heterogenous set of nodes in a distributed network. `ao` is designed
to offer an environment in which an arbitrary number of paralell processes can
be resident, coordinating through an open message passing layer. This message
passing standard connects the machine's indepedently operating processes
together into a 'web' -- in the same way that websites operate on independent
servers but are conjoined into a cohesive, unified experience via hyperlinks.

Unlike existing decentralized compute systems, `ao` is capable of supporting the
operation of computation without protocol-enforced limitations on size and form,
while also maintaining the verifiability (and thus, trust minimization) of the
network itself. Further, `ao`'s distributed and modular architecture allows
existing smart contract platforms to easily 'plug in' to the network, acting as
a single process which can send and recieve messages from any other process.

Instead of enforcing one set of choices upon all users of the computing
environment, `ao` is built in a modular form: Allowing users to choose which
virtual machines, sequencing decentralization trade-offs, message passing
security guarantees, and payment options work best for them. This modular
environment is then unified by the eventual settlement of all messages -- each
sharing the same format -- onto Arweave's decentralized data layer. This
modularity creates a unified computing environment suiting an extremely wide set
of workloads, in which every process can easily transfer messages and cooperate.

`ao`'s core objective is to enable trustless and cooperating compute services
without any practical bounds on scale. This allows for a radically new design
space of applications that were not previously possible: Blending the benefits
of smart contract applications (services without requiring trust in anything but
code), and traditional compute environments (Amazon EC2, etc).

Due to its scalability, the natural way for developers to use `ao` is to spawn
their own command-line (`aos`) process inside the network, and to start issuing
commands. This DevX is similar to how developers create a new server instance at
a cloud host and connect to it via SSH, except that this command line process
has the properties of a smart contracts. Their commandline process on `ao`
doesn't live in any specific data center or at any one physical location, and
its computation is completely trustless. Every user can message and interact
with every other process and program. The result of this is a global 'Single
System Image': A unified computer -- spread around the world, operating at any
scale -- shared between all users.

From the end-user or developer's perspective, the essence of `ao` is simple:
`ao` is a shared computer that they can run any number of processes inside.
These processes are not hosted on any specific servers, or under the control of
any one individual or group. Instead, once launched these processes can be
cryptographically entrusted to render their services in a provably neutral
manner, permanently. This enables them to guarantee rights to their users over
time.

For more information about `ao` - check out our spec - https://ao.arweave.dev -
and cookbook - https://cookbook_ao.arweave.dev

<!-- toc -->

- [What is `ao`?](#what-is-ao)
- [Projects](#projects)
- [Self Hosting an ao Unit](#self-hosting-an-ao-unit)
- [Contributing](#contributing)
- [License](#license)

<!-- tocstop -->

## Projects

- [`ao` CLI](./dev-cli): The `ao` Command Line Interface that can be installed
  on the command line and used to initialize, build, run, and publish `ao` Lua
  -> WASM Contracts
- [`ao` JS Loader](./loader): The `ao` JavaScript Loader that enabled invoking
  an `ao` Contract, built into WASM, from a JavaScript context.
- [`ao` Connect](./connect): The `ao` JavaScript library that provides an
  abstraction for spawning, evaluating, and interacting with `ao` Processes on
  node or in the browser.
- [`ao` Compute Unit (`cu`)](./servers/cu): An implementation of the `ao`
  Compute Unit, aka a `cu` (pronounced "koo" 🦘)
- [`ao` Messenger Unit (`mu`)](./servers/mu): An implementation of the `ao`
  Messaenger Unit, aka a `mu` (pronounced "moo" 🐄)
- [`ao` Scheduler Unit (`su`)](./servers/su): An implementation of the `ao`
  Scheduler Unit, aka a `su` (pronounced "soo" 👧)
- [`ao` Unit Router (`ur`)](./servers/ur): A Simple Reverse Proxy whose API can
  mirror an underlying set of `ao` Unit Hosts (`mu`s or `cu`s) (pronounced
  "youwer" 🔀)
- [`ao` Lua Examples](./lua-examples): Various examples of projects leveraging
  `ao` Contracts and components.

## Self Hosting an ao Unit

The core team's current focus is the active development of the ao Data Protocol
and reference implementations, which are undergoing constant change.

Folks are welcome to run their own instances of the ao Unit reference
implementations for the purpose of experimentation, but there are currently no
guarantees or core support for doing so.

## Contributing

SEE [CONTRIBUTING](CONTRIBUTING.md)

## License

The ao and aos codebases are offered under the BSL 1.1 license for the duration
of the testnet period. After the testnet phase is over, the code will be made
available under either a new
[evolutionary forking](https://arweave.medium.com/arweave-is-an-evolutionary-protocol-e072f5e69eaa)
license, or a traditional OSS license (GPLv3/v2, MIT, etc).
