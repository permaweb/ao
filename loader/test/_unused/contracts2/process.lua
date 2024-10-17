-- Corresponding local wasm at ./process.wasm
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
actions['count'] = function(state)
    local _state = assoc('count', state.count + 1, state)
    return {state = _state, output = "count: " .. tostring(_state.count)}
end
actions['hello'] = function(state, message)
    return {
        state = state,
        output = "Hello " .. findObject(message.Tags, "name", "recipient").value
    }
end

function process.handle(message, AoGlobal)
    if state == nil then state = {count = 0} end
    local res = actions[findObject(message.Tags, "name", "function").value](
                    state, message, AoGlobal)
    state = res.state
    local output = res.output

    print(output)

    return {Output = output}
end

return process
