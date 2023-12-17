-- Corresponding local wasm at ./process.wasm
local JSON = require("json")

local process = { _version = "0.0.6" }

local function assoc(prop, val, obj)
  local result = {}
  for p, k in pairs(obj) do
    result[p] = k
  end
  result[prop] = val
  return result
end

local function findObject(array, key, value)
  for i, object in ipairs(array) do
    if object[key] == value then
      return object
    end
  end
  return nil
end

local function dump(o)
  if type(o) == 'table' then
     local s = '{ '
     for k,v in pairs(o) do
        if type(k) ~= 'number' then k = '"'..k..'"' end
        s = s .. '['..k..'] = ' .. dump(v) .. ','
     end
     return s .. '} '
  else
     return tostring(o)
  end
end

local actions = {}
actions['counter'] = function (state)
  return assoc('counter', state.counter + 1, state), nil
end
actions['errorResult'] = function (state)
  return state, { code = 123, message = "a handled error within the process" }
end
actions['errorThrow'] = function ()
  return error({ code = 123, message = "a thrown error within the process" })
end
actions['errorUnhandled'] = function ()
  process.field.does_not_exist = 'foo'
end

function process.handle(message, AoGlobal)
  if state == nil then state = { counter = 0 } end

  state, err = actions[findObject(message.Tags, "name", "function").value](state, message, AoGlobal)

  return { Error = err, Output = JSON.encode(state.counter) }
end

return process
