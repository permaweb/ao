-- This script is bridge program for WASM
local args = {...}
local lua_bundle = args[1]

math.random = function()
    return 0.5 -- Replace with any value you want
end
-- Inline loader
-- In WASM Lua, all Lua scripted will be compiled as byte string and set to lua_bundle table.
-- Then, this loader will resolve by module name and evaluate it.
local function _inline_loader(name)
    local mod = lua_bundle[name] or lua_bundle[name .. '.init']
    if not mod then return ("module %s not found"):format(name) end
    if type(mod) == 'string' then
        local chunk, err = load(mod, name)
        if chunk then
            return chunk
        else
            error(("error loading module %s: %s"):format(name, err), 0)
        end
    elseif type(mod) == 'function' then
        return mod
    end
end

table.insert(package.loaders or package.searchers, 2, _inline_loader)

-- The __lua_webassembly__ module will be inject via C program.
local main = _inline_loader('__lua_webassembly__')
main()

-- Export function call wrapper
-- function lua_call(function_name, ...)
--   for k, v in pairs(exports) do
--     print(k)
--   end
--   print(exports['hello_world'])
--   print(#function_name)
--   print(function_name == 'hello_world')
--   print(function_name == 'hello_world')
--   print(type(function_name))
-- 
--   local mod = exports[function_name]
--   if not mod then
--     print(("Module %s isn't exported"):format(function_name))
--     return
--   elseif type(mod) ~= 'table' then
--     print(("Module %s exported but not an table"):format(function_name))
--     return
--   end
-- 
--   local fn = mod.fn
--   if not fn then
--     print(("Module %s.fn is not defined"):format(function_name))
--     return
--   elseif type(fn) ~= 'function' then
--     print(("Module %s.fn is not a function"):format(function_name))
--     return
--   end
--   -- Call exported function
--   local arguments = {select(1, ...)}
--   return fn(table.unpack(arguments))
-- end
