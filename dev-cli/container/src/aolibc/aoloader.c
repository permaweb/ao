/*
 * Author: Peter Farber
 * Description: This code is designed to load and dynamically register WebAssembly modules with Lua.
 * It includes custom functionality for parsing WebAssembly files to locate and load symbols, 
 * specifically symbols used by Lua modules.
*/

#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>
#include <dlfcn.h>
#include <string.h>
#include <stdint.h>

#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"

#include "aostdio.h"

// WebAssembly file format constants
#define WASM_MAGIC 0x6d736100    // WebAssembly magic number
#define WASM_VERSION 0x1         // Supported WebAssembly version
#define WASM_SECTION_EXPORT 7    // Export section ID

// Writes the provided buffer to a temporary file, returning the file path.
char* write_buffer_to_temp_file(const char* buffer, size_t size) {
    // Create a unique temporary file name.
    char *temp_file_path = strdup("/tmp/temp_libXXXXXX");
    int fd = mkstemp(temp_file_path);

    if (fd == -1) {
        perror("Failed to create temporary file");
        free(temp_file_path);
        return NULL;
    }

    // Write buffer content to file and check for success.
    if (write(fd, buffer, size) != size) {
        perror("Failed to write to temporary file");
        close(fd);
        unlink(temp_file_path);
        free(temp_file_path);
        return NULL;
    }

    close(fd);  // Close the file descriptor.
    return temp_file_path;
}

// Reads a LEB128 encoded unsigned integer from a pointer, advancing the pointer.
uint32_t read_leb128(const uint8_t **ptr) {
    uint32_t result = 0;
    uint32_t shift = 0;
    while (1) {
        uint8_t byte = *(*ptr)++;
        result |= (byte & 0x7F) << shift;
        if ((byte & 0x80) == 0) break;
        shift += 7;
    }
    return result;
}

// Reads a length-prefixed string from a pointer, advancing the pointer.
char* read_string(const uint8_t **ptr) {
    uint32_t length = read_leb128(ptr);
    char *str = (char*)malloc(length + 1);
    memcpy(str, *ptr, length);
    str[length] = '\0';
    *ptr += length;
    return str;
}

// Parses the WebAssembly Export section to find "luaopen_" symbols, indicating Lua module exports.
char* parse_export_section(const uint8_t *ptr, const uint8_t *end, char **module_name) {
    uint32_t count = read_leb128(&ptr); // Number of exports

    // Loop through all exports
    for (uint32_t i = 0; i < count && ptr < end; i++) {
        char *name = read_string(&ptr);      // Read the export name
        uint8_t kind = *ptr++;               // Read export kind (0x00 = function, etc.)
        read_leb128(&ptr);                   // Skip over the index

        // Check if it's a function and starts with "luaopen_"
        if (kind == 0x00 && strncmp(name, "luaopen_", 8) == 0) {
            *module_name = strdup(name + 8); // Set module name to part after "luaopen_"
            printf("Found luaopen symbol: %s\n", name);
            return name;                     // Return the full "luaopen_*" symbol name
        }
        free(name); // Free if not a match
    }
    return NULL;
}

// Extracts the luaopen symbol and module name by parsing a WebAssembly file.
char* extract_luaopen_symbol(const char *wasm_file, char **module_name) {
    printf("Extracting symbols from %s\n", wasm_file);

    // Open and read the file
    FILE *file = fopen(wasm_file, "rb");
    if (!file) {
        perror("Failed to open file");
        return NULL;
    }
    fseek(file, 0, SEEK_END);
    size_t size = ftell(file);
    fseek(file, 0, SEEK_SET);

    uint8_t *buffer = malloc(size);
    fread(buffer, 1, size, file);
    fclose(file);

    // Check the Wasm file header
    const uint8_t *ptr = buffer;
    if (*(uint32_t*)ptr != WASM_MAGIC || *(uint32_t*)(ptr + 4) != WASM_VERSION) {
        fprintf(stderr, "Not a valid WebAssembly binary\n");
        free(buffer);
        return NULL;
    }
    ptr += 8; // Move past the magic number and version

    // Loop through sections to find the export section
    char *symbol = NULL;
    while (ptr < buffer + size) {
        uint8_t section_id = *ptr++; // Read section ID
        uint32_t section_size = read_leb128(&ptr);
        const uint8_t *section_end = ptr + section_size;

        // If export section, parse it for symbols
        if (section_id == WASM_SECTION_EXPORT) {
            symbol = parse_export_section(ptr, section_end, module_name);
            break; // Stop after finding the export section
        }

        ptr = section_end; // Skip to next section
    }

    free(buffer);
    return symbol;
}

// Loads a WebAssembly .so file dynamically and registers its module with Lua.
static int loadLib(lua_State *L) {
    const char *txid = lua_tostring(L, 1);
    printf("Opening file: %s\n", txid);

    // Open the library file using WeaveDrive
    int fd = weavedrive_open_c(txid, "r");
    if (fd < 0) {
        lua_pushnil(L);
        return 1;
    }

    // Read the file content into a buffer
    int buffer[5242880]; // About 20mb
    ssize_t bytesRead = weavedrive_read_c(fd, buffer, sizeof(buffer));
    if (bytesRead < 0) {
        perror("Failed to read library contents");
        lua_pushnil(L);
        return 1;
    }

    // Write buffer to a temporary file and get its path
    char *temp_file_path = write_buffer_to_temp_file((char*)buffer, bytesRead);
    if (!temp_file_path) {
        lua_pushnil(L);
        return 1;
    }

 // Extract luaopen symbol and module name
    char *module_name = NULL;
    char *symbol = extract_luaopen_symbol(temp_file_path, &module_name);
    printf("Symbol: %s, Module: %s\n", symbol ? symbol : "None", module_name ? module_name : "None");

    // Dynamically load the WebAssembly .so file
    void *handle = dlopen(temp_file_path, RTLD_LAZY);
    if (!handle) {
        fprintf(stderr, "Error opening WebAssembly .so: %s\n", dlerror());
        unlink(temp_file_path);
        free(temp_file_path);
        lua_pushnil(L);
        return 1;
    }

    // If no luaopen symbol, load the library and clean up without Lua registration
    if (!symbol || !module_name) {
        printf("No luaopen symbol found, loading library without Lua registration.\n");
        dlclose(handle);  // Close handle if not registering with Lua
        unlink(temp_file_path);
        free(temp_file_path);
        return 1;
    }

    // Locate the luaopen function within the loaded .so
    lua_CFunction luaopen_func = (lua_CFunction) dlsym(handle, symbol);
    if (!luaopen_func) {
        fprintf(stderr, "Error finding symbol '%s': %s\n", symbol, dlerror());
        dlclose(handle);
        unlink(temp_file_path);
        free(temp_file_path);
        lua_pushnil(L);
        return 1;
    }

    // Execute the luaopen function and add the module to Lua's global scope
    lua_pushcfunction(L, luaopen_func);
    if (lua_pcall(L, 0, 1, 0) != LUA_OK) {
        const char *error = lua_tostring(L, -1);
        fprintf(stderr, "Error calling luaopen function: %s\n", error);
        lua_pop(L, 1);
        dlclose(handle);
        unlink(temp_file_path);
        free(temp_file_path);
        lua_pushnil(L);
        return 1;
    }

    // Ensure the result is a Lua table and set it globally
    if (!lua_istable(L, -1)) {
        fprintf(stderr, "Error: luaopen function did not return a table.\n");
        lua_pop(L, 1);
        dlclose(handle);
        unlink(temp_file_path);
        free(temp_file_path);
        lua_pushnil(L);
        return 1;
    }
    lua_setglobal(L, module_name);

    // Clean up resources
    dlclose(handle);
    unlink(temp_file_path);
    free(symbol);
    free(module_name);

    return 1;
}

// Lua function registration
static const struct luaL_Reg loader_funcs[] = {
    {"load", loadLib},
    {NULL, NULL}
};

// Lua module initialization
int luaopen_loader(lua_State *L) {
    luaL_newlib(L, loader_funcs);
    return 1;
}
