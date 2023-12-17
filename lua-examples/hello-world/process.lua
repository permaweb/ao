-- Corresponding local wasm at ./process.wasm
-- published at IKZzFN5JvCf3XCOx1kw940sjY9zAbsd6Wm7MMRgf_Zk
-- with 'say' function support at QU75imHrJN1bOnzlLvLVXiVcSr1EQgA4aLCQG5tvklY
-- with 'friend' function support at V4Z_o704ILkjFX6Dy93ycoKerywfip94j07dRjxMCPs

local JSON = require("json")
local base64 = require(".base64")

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

local function dedup(originalTable)
  local dedupTable = {}
  local addedNames = {}

  for _, entry in ipairs(originalTable) do
      if not addedNames[entry.name] then
          table.insert(dedupTable, entry)
          addedNames[entry.name] = true
      end
  end

  return dedupTable
end

local function spawn(tags, AoGlobal) 
  local srcId = findObject(tags, "name", "src-id").value

  -- data = srcId doesnt have any effect were just using srcId as a placeholder,
  -- { name = "Contract-Src", value = srcId } is what a mu will use to spawn
  local newFriend = {
    Data = srcId,
    Tags = {
      { name = "Data-Protocol", value = "ao" },
      { name = "Type", value = "Process" },
      { name = "Module", value = srcId }
    }
  }

  for k,v in pairs(tags) do
    -- skip the tags used by this contract internally
    if v.name ~= 'function' and v.name ~= 'src-id' then
      table.insert(newFriend.Tags, { name = v.name, value = v.value })
    end
  end

  newFriend.Tags = dedup(newFriend.Tags)

  return newFriend
end

local function send(tags, target, AoGlobal)
  local message = {
    Target = target,
    Tags = {
      { name = "Data-Protocol", value = "ao" },
      { name = "Type", value = "Message" },
    }
  }

  for k,v in pairs(tags) do
    table.insert(message.Tags, { name = k, value = v })
  end

  return message
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
actions['say'] = function (state, message)
  local data = base64.decode(message.Data.Data)
  return { state = state , output = JSON.encode(data) }
end
actions['friend'] = function (state, message, AoGlobal)
  local friends = {}
  local friend = spawn(message.Tags, AoGlobal)
  table.insert(friends, friend)
  -- result.output is just for display in the repl here 
  local o = { friendlyMessage = 'Spawn returned in result.spawns' }
  return { state = state, output = JSON.encode(o), spawns = friends }
end
actions['ping'] = function (state, message)
  local target = findObject(message.Tags, "name", "friend").value
  local tags = {
    { name = "function", value = "pong" }
  }

  local o = { friendlyMessage = 'sending ping to ' .. target }
  return { state = state, output = JSON.encode(o), messages = { send(tags, target) } }
end
actions['pong'] = function (state, message)
  local friend = findObject(message.Tags, "name", "friend").value
  local o = { friendlyMessage = 'received pong from ' .. friend }
  return { state = state, output = JSON.encode(o) }
end

function process.handle(message, AoGlobal)
  if state == nil then state = { helloCount = 0 } end

  local res = actions[findObject(message.Tags, "name", "function").value](state, message, AoGlobal)
  state = res.state
  local output = res.output
  local spawns = res.spawns
  local messages = res.messages
  if (state.heardHello and state.heardWorld) then state = assoc('happy', true, state) end

  return { Output = output, Messages = messages, Spawns = spawns }
end

return process
