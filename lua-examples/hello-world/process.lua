-- Corresponding local wasm at ./process.wasm
-- published at IKZzFN5JvCf3XCOx1kw940sjY9zAbsd6Wm7MMRgf_Zk

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
actions['hello'] = function (state)
  local _state = assoc('heardHello', true, state)
  _state = assoc('helloCount', _state.helloCount + 1, _state)
  return { state = _state, output = nil }
end
actions['world'] = function (state)
  local _state = assoc('heardWorld', true, state)
  return { state = _state, output = nil }
end
actions['raw'] = function (state)
  return { state = state , output = JSON.encode(state) }
end

function process.handle(message, AoGlobal)
  if state == nil then state = { helloCount = 0 } end

  local func = findObject(message.tags, "name", "function")
  if func == nil then return error({ code = 500, message = 'no function tag in the message'}) end

  local res = actions[func.value](state, message, AoGlobal)
  state = res.state
  local output = res.output
  if (state.heardHello and state.heardWorld) then state = assoc('happy', true, state) end

  return { output = output }
end

return process
