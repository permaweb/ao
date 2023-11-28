local JSON = require("json")
local ao = require('.ao')

local process = { _version = "0.0.6" }

local function findObject(array, key, value)
  for i, object in ipairs(array) do
    if object[key] == value then
      return object
    end
  end
  return nil
end

function initializeState(msg, env)
  if not owner then
    owner = env.process.owner
  end

  if not inbox then
    inbox = {}
  end

  if not name then
    local aosName = findObject(msg.tags, "name", "name")
    if aosName then
      name = aosName.value
    else
      name = 'aos'
    end
  end

  if not prompt then
    local promptObject = findObject(msg.tags, "name", "prompt")
    if promptObject then
      prompt = promptObject.value
    else
      prompt = 'aos'
    end
  end
end

function version()
  print("version: " .. process._version)
end

function process.handle(msg, env)
  initializeState(msg, env)

  local fn = findObject(msg.tags, "name", "function")

  if fn ~= nil and fn.value == "eval" and owner == msg.owner then
    local messages = {}
    local spawns = {}
    local env = {
      _global = _G,
      state = state
    }

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

    -- exec expression
    local expr = findObject(msg.tags, "name", "expression")
    if (expr == nil) then return { error = "could not find expression" } end

    local func, err = load(expr.value, 'aos', 't', _G)
    local output = ""
    if func then
      output, e = func()
    else
      output = err
    end
    if e then output = e end

    return { output = { data = { output = output, prompt = prompt } }, messages = messages, spawns = spawns }
  else
    -- Add Message to Inbox
  end

  return { error = "could not find action" }
end

return process