# AO DEV-CLI Container

<!-- toc -->

- [Overview](#overview)
- [Key Features](#key-features)
  - [Dynamic WASM Library Loading with `loader`](#dynamic-wasm-library-loading-with-loader)
  - [Example WASM Library Code](#example-wasm-library-code)
  - [Compilation Command](#compilation-command)
  - [Module Functions](#module-functions)

<!-- tocstop -->

## Overview
The **AO DEV-CLI Container** now includes support for dynamic loading of WebAssembly (WASM) libraries through the `loader` module. This feature allows for the on-demand loading of WASM libraries into Lua scripts, with the added ability to retrieve them directly from Arweave using transaction IDs. To accommodate this functionality, the process for building and running WASM modules in AO has been updated, including new requirements for compiler flags and exported functions.

## Key Features

### Dynamic WASM Library Loading with `loader`
The `loader` module provides a straightforward way to load WASM libraries dynamically using an Arweave transaction ID. Once loaded, you can interact with the library’s functions within Lua.

To load a WASM library, use `loader.load` with an Arweave transaction ID, as shown below:

```lua
-- Example usage of the AO loader module for loading a WebAssembly (WASM) library
local loader = require('loader')  -- Import the loader module for dynamic loading

-- Load the WASM library from Arweave using its transaction ID
-- Here, "/data/NLsROurr4RVrPexh8SoKy2PZM6eT043K3lYe0L0V-B0" represents the specific Arweave ID
loader.load('/data/NLsROurr4RVrPexh8SoKy2PZM6eT043K3lYe0L0V-B0')

-- Call a function from the dynamically loaded WASM module
-- This "create" function is just a basic example function that prints and returns "Hello World!"
local res = dynmodule.create()
print(res)  -- Output should be "Hello World!"
```

### Example WASM Library Code
The following C code is an example of a simple WASM library that provides a `"create"` function, which outputs `"Hello World!"` and returns it as a Lua string. This function is then accessible in Lua once the WASM library is loaded with `loader`.

```c
#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"
#include <stdio.h>

// Function that prints and returns "Hello World!"
static int l_helloworld(lua_State *L) {
    // Print to console
    printf("Hello World!\n");

    // Push the string "Hello World!" onto the Lua stack and return it
    lua_pushstring(L, "Hello World!");
    return 1;  // Number of return values to Lua
}

// Table of functions to be registered in Lua, mapping names to C functions
static const struct luaL_Reg module_funcs[] = {
    {"create", l_helloworld},  // Maps "create" to the l_helloworld function
    {NULL, NULL}               // Sentinel value indicating end of table
};

// Initialization function called when Lua loads this module
int luaopen_dynmodule(lua_State *L) {
    // Register the module's functions in a new table and return it
    luaL_newlib(L, module_funcs);
    return 1;  // One return value to Lua (the table of functions)
}
```

### Compilation Command
To compile this library as a WASM module compatible with AO's `loader`, use the following command:

```bash
emcc /src/dynmodule.c -sSIDE_MODULE -I/lua-5.3.4/src -o /src/dynmodule.o
```

### Module Functions
The WASM library exports a `"create"` function, accessible in Lua as `dynmodule.create()`, which simply prints `"Hello World!"` and returns it as a string. This function serves as an example of how WASM functions can be called from Lua using the `loader` module.
