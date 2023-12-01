# intro to ao as a developer

`ao` is an approach to distributed compute that leverages the Actor Architecture in a network that is by default distributed as a first principle. There is no shared memory between `processes`.

<!-- toc -->

- [What is a process?](#what-is-a-process)
- [What is a message?](#what-is-a-message)
- [Interoperability](#interoperability)
- [How do the messages flow?](#how-do-the-messages-flow)
- [The units](#the-units)
  - [Messenger Unit (mu)](#messenger-unit-mu)
  - [Sequencer Unit (su)](#sequencer-unit-su)
  - [Compute Unit (cu)](#compute-unit-cu)
  - [Process Source](#process-source)
- [Preview](#preview)
  - [Implemenation Details](#implemenation-details)
    - [Developer CLI](#developer-cli)
    - [Meet Lua](#meet-lua)
    - [Using the Developer CLI](#using-the-developer-cli)

<!-- tocstop -->

## What is a process?

A process is an instanciated unit of code that has state and can evaluate `messages` that can either `read` or `write` to that state. 

A process can:

* receive messages
* send messages
* create new processes

## What is a message?

A message is a set of data that can inform the process of an action to do, or to retieve a specific value of its state. The message is based on the `data-item` specification defined in ANS-104 of the ArBundles specification. This specification describes a binary format that organizes data in a structured way. In `ao` we call these `messages`.

## Interoperability

In all systems of compute, you need things to talk to each other, with `ao` the communication is achieved via messages, if `process-A` wants to tell `process-B` something, it MUST be sent via a `message`. If `process-B` wants to know something about `process-A`, `process-B` MUST send a message, and `process-A` MUST receive that message and send a `message` back to `process-B`. These simple rules enable for `process-A` to exist in a completely different space than `process-B`. They do not even have to know where they are running, they do not depend on each other to operate.

## How do the messages flow?

A mailbox system is in place with a `messenger unit (mu)`, so when `process-A` wants to send a message, it just places the message in it's outbox, and a `mu` will read that message and dispatch it through `ao` to the target process. Each process also can have an inbox, to receive messages, do stuff, then send messages or spawn new processes.

## The units

The network is made up of three core units.

1. Messenger Unit (mu)
2. Sequencer Unit (su)
3. Compute Unit (cu)

### Messenger Unit (mu)

This is the door to the network, when a user would like to interact with processes within `ao` they submit a `message` to the `mu`. The `mu` verifies the message and sends to `su` for scheduling. The `mu` also, keeps track of the messages and spawns created from this message and proceeds to dispatch thoses messages, until the cycle is complete. 

### Sequencer Unit (su)

The sequencer, (hint: its in the name), sequences messages for the processes, so there will always be a deterministic order of how messages are dispatched to the process. The sequencer, also stores each message on the Arweave Network, as long as the message is properly signed.

### Compute Unit (cu)

The compute unit, manages the processes and handles the messages. The `cu` retrieves the messages from the `su` and either spawns new processes or resumes existing processes, passes the message to the process, then gets the result. 

### Process Source

The source modules of a process are compiled to `WASM`, these modules can be any type of `WASM` compatible binaries and MUST be stored on Arweave for permanent unchanged access. 

---

## Preview

The preview release of `ao` is a proof of authority release, this means that trust is authorized by authority, in the near feature there will be an early release that is based on proof of stake.

### Implemenation Details

The `ao-protocol` is designed to support many different implementations, it is important that the protocol itself is COMPLETE and capable of future implementations over time. But the best way to believe is to see it work, so we have built an implementation of the `ao-protocol`, this implementation is very much a `preview` POA model, we do feel that this implementation will evolve into a `early` POS model in the future.

#### Developer CLI

In our design sessions we looked at many initial technologies for implementing the WASM module and arrived at using `lua` as the process language and `emscripten` as the WASM compile target.

#### Meet Lua

Hi, I am lua, I am a deterministic embeddable script language that is very small, but I am mighty, I can do many of the things that other languages can, and I am flexible so you can use me in various of paridigms from imperative to functional. I support closures, modules and many of the higher level features you may be accustomed to as a developer. I am popular in servers and games. Here is an example of a `lua` ao process.

```lua
local process = {
  _version = "0.0.1"
}

function process.handle(message, env)
  if not state then
    state = {}
  end

  if message.tags['function'] == "count" then
    state.counter = state.counter + 1
  end


  return {
    output = {
      owner = env.process.id,
      data = "increased counter",
      tags = {{
        name = "Content-Type",
        value = "text/plain"
      }}
    },
    messages = {},
    spawns = {}
  }
end

return process

```

This is the main function of an `ao` process, you will specific inputs and output. The input takes a `message` which is of type ANS-104:DataItem, but it is presented in the form of a lua Table. 

> NOTE: Lua Tables are very similar to JavaScript Objects.

You will also notice another input called `env` or enviroment, this provides a table of the `ao` environment at the point the process `handle` function is being invoked.

```lua 
env = {
  source = {
    id = "SOURCE_ID",
    tags = { ... }
  },
  process = {
    id = "PROCESS_ID",
    tags = { ... }
  },
  block = {
    id = "BLOCK_ID",
    timestamp = "TIMESTAMP"
  }
  ...
}
```

Finally, you will notice the `return` is of type `result` this result type contains the following properties:

* output
* messages
* spawns

The output object is a DataItem type, and messages and spawns are sets of `messages`



#### Using the Developer CLI

Ok, that is a lot to think about, but we will help you out. If you install the `ao` developer cli, you can use a couple of commands to help you navigate the builder process of `ao`

`ao init [PROJECT NAME}` - this command will create a new project folder and a `process.lua` file for you to start building your process source.

Build your `process.lua` contract and you connect with it in a `repl` just type `ao repl`. Or if you want to test it via `lua` script, you can run `ao run [TEST_SCRIPT]`. To build, run `ao build` and to publish run `ao publish`.
