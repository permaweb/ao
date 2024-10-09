/*
 * Author: Peter Farber
 * Description: This code registers a Lua module that provides a function to retrieve the gas usage 
 * from a WebAssembly environment using Emscripten. This is particularly useful for WebAssembly 
 * metering systems where gas usage needs to be monitored in Lua scripts.
*/

#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"

#include <emscripten.h>

// JavaScript bridge function to retrieve gas usage from WebAssembly metering
// This function communicates with JavaScript to get the current gas usage.
EM_JS(int, metering_gasUsed, (), {
    return Module.gas.used;
});

// Lua wrapper function to expose gas usage in Lua
// Retrieves the gas usage and pushes it onto the Lua stack as a number
static int gasUsed(lua_State *L) {
    lua_pushnumber(L, metering_gasUsed());
    return 1;  // Returns one result to Lua
}

// Lua function registration array
// Maps Lua function names to C functions for this module
static const struct luaL_Reg aolib_funcs[] = {
    {"gasUsed", gasUsed},   // Registers 'gasUsed' function for Lua
    {NULL, NULL}            // Sentinel value indicating end of array
};

// Module initialization function
// Called when the module is loaded in Lua to register the module's functions
int luaopen_metering(lua_State *L) {
    luaL_newlib(L, aolib_funcs);  // Creates a new Lua table with functions from aolib_funcs
    return 1;  // Returns the table to Lua as the module
}
