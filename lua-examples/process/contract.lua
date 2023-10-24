local JSON = require("json")
local ao = { _version = "0.0.1" }

-- Published WASM at Isk_GYo30Tyf5nLbVI6zEJIfFpiXQJd58IKcIkTu4no

function ao.send(input, target, AO) 
  local message = {
    target = target,
    tags = {
      { name = "Data-Protocol", value = "ao" },
      { name = "ao-type", value = "message" },
      { name = "Forwarded-For", value = AO.process.id }
    }
  }
  
  for k,v in pairs(input) do
    table.insert(message.tags, { name = k, value = v })
  end

  return message
end

function ao.spawn(data, tags, AO) 
  local spawn = {
    data = data,
    tags = {
      { name = "Data-Protocol", value = "ao" },
      { name = "ao-type", value = "process" },
      { name = "Forwarded-For", value = AO.process.id }
    }
  }

  for k,v in pairs(tags) do
    table.insert(spawn.tags, { name = k, value = v })
  end

  return spawn
end

local contract = { _version = "0.0.6" }

function contract.handle(state, message, AO)
  local env = {
    _global = _G,
    state = state
  }

  if message.tags["function"] == "eval" and state.owner == message.owner then
    local messages = {}
    local spawns = {}

    if state["_session"] == nil then
      state["_session"] = {}
    end
    -- load session
    for i,v in ipairs(state["_session"]) do
      pcall(function() load(v,'session','t', env)() end)
    end

    function env.send(target, input) 
      local message = ao.send(input, target, AO)
      table.insert(messages, message)     
      return 'message added to outbox'
    end

    function env.spawn(data, input) 
      local spawn = ao.spawn(data, input, AO)
      table.insert(spawns, spawn)
      return 'spawn process request'
    end

    -- load fns into env
    -- exec expression
    local func, err = load(message.tags.expression, 'aos', 't', env)
    local output = "" 
    if func then
      output, e = func()
      -- TODO: Need to ignore `send` and `spawn` expressions
      table.insert(state["_session"], message.tags.expression)
    else 
      output = err
    end 
    if e then output = e end
    
    -- local result = JSON.encode(messages)
    return { state = state, result = { output = output, messages = messages, spawns = spawns }}
  end

  table.insert(state.inbox, message.tags.expression)

  if message.tags['function'] and state._fns[message.tags['function']] then
    load(string.format("%s = %s", message.tags['function'], state._fns[message.tags['function']]), 'fns', 't', env)()
    --load(string.format("%s()", message.tags['function']), "fns", 't', env)()
  end

  local response = {
    result = { error = "could not find action" }
  }
  return response
end

return contract