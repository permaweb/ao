-- This contract is published to Arweave for the purpose of testing
-- the SDK end to end. If you alter this contract code, be sure
-- to build and publish using the ao CLI, and use the new Contract Source to
-- create a new contract and interactions

-- Corresponding local wasm at ./contract.wasm

local contract = { _version = "0.0.1" }

local function assoc(prop, val, obj)
  local result = {}
  for p, k in pairs(obj) do
    result[p] = k
  end
  result[prop] = val
  return result
end

local function find(predicate, table) -- find element v of l satisfying f(v)
  for _, v in ipairs(table) do
    if predicate(v) then
      return v
    end
  end
  return nil
end

local function hello(state)
  return assoc('heardHello', true, state)
end

local function world(state)
  return assoc('heardWorld', true, state)
end

local actions = {}
actions['hello'] = hello
actions['world'] = world

function contract.handle(state, message, AoGlobal)
  local func = find(
    function (value)
      return value.name == 'function'
    end,
    message.tags
  )
  if func == nil then return error({ code = 500, message = 'no function tag in the message'}) end

  local newState = actions[func.value](state, message, AoGlobal)

  newState = assoc('lastMessage', message, newState)

  if (newState.heardHello and newState.heardWorld) then
    newState = assoc('happy', true, newState)
  end

  return {
    state = newState,
    result = {
      -- stub messages
      messages = {
        {
          target = 'process-foo-123',
          tags = {
            { name = 'foo', value = 'bar' },
            { name = 'function', value = 'noop' }
          }
        }
      },
      -- stub spawns
      spawns = {
        {
          owner = 'owner-123',
          tags = {
            { name = 'foo', value = 'bar' },
            { name = 'balances', value = "{\"myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc\": 1000 }" }
          }
        }
      },
      -- stub output
      output = 'foobar'
    }
  }
end

return contract
