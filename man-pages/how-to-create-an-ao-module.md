# how to create an ao module

It is assumed that you've [Setup the dev cli](./how-to-setup-the-dev-cli.md)

<!-- toc -->

- [Initialize a process](#initialize-a-process)

<!-- tocstop -->

## Initialize a process

```zsh
ao init my-process
```

This will create a new directory called `my-process` with a `process.lua` file in it:

```lua
local process = { _version = "0.0.1" }

function process.handle(msg, env) 
  -- do stuff
  local response = {
    output = "Hello World",
    messages = {},
    spawns = {}
  }
  return response
end

return process
```