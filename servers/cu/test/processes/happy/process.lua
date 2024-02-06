-- Corresponding local wasm at ./process.wasm
local JSON = require("json")

local process = {_version = "0.0.6"}

local function assoc(prop, val, obj)
    local result = {}
    for p, k in pairs(obj) do result[p] = k end
    result[prop] = val
    return result
end

local function findObject(array, key, value)
    for i, object in ipairs(array) do
        if object[key] == value then return object end
    end
    return nil
end

local function dump(o)
    if type(o) == 'table' then
        local s = '{ '
        for k, v in pairs(o) do
            if type(k) ~= 'number' then k = '"' .. k .. '"' end
            s = s .. '[' .. k .. '] = ' .. dump(v) .. ','
        end
        return s .. '} '
    else
        return tostring(o)
    end
end

local actions = {}
actions['hello'] = function(state) return assoc('heardHello', true, state) end
actions['world'] = function(state) return assoc('heardWorld', true, state) end

function process.handle(message, AoGlobal)
    if state == nil then state = {} end

    state = actions[findObject(message.Tags, "name", "function").value](state,
                                                                        message,
                                                                        AoGlobal)
    state = assoc('lastMessage', message, state)
    if (state.heardHello and state.heardWorld) then
        state = assoc('happy', true, state)
    end

    return {
        -- stub messages
        Messages = {
            {
                Target = 'process-foo-123',
                Tags = {
                    {name = 'foo', value = 'bar'},
                    {name = 'function', value = 'noop'}
                }
            }
        },
        -- stub spawns
        Spawns = {
            {
                Owner = 'owner-123',
                Tags = {
                    {name = 'foo', value = 'bar'}, {
                        name = 'balances',
                        value = "{\"myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc\": 1000 }"
                    }
                }
            }
        },
        -- So we can assert the state in tests
        Output = JSON.encode(state)
    }
end

return process
