-- This contract is published to Arweave for the purpose of testing
-- the SDK end to end. If you alter this contract code, be sure
-- to build and publish using the ao CLI, and use the new Contract Source to
-- create a new contract and interactions

-- Corresponding local wasm at ./contract.wasm
-- Published source as: 9TVItobwHX4HXuKoHYzCJcXC2JIeeyOXdgV-X6Sf4aQ

local contract = { _version = "0.0.1" }

local function assoc(prop, val, obj)
  local result = {}
  for p, k in pairs(obj) do
    result[p] = k
  end
  result[prop] = val
  return result
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

function contract.handle(state, action, SmartWeave)
  local newState = actions[action.input['function']](state, action, SmartWeave)

  if (newState.heardHello and newState.heardWorld) then
    newState = assoc('happy', true, newState)
  end

  return {
    state = newState,
    result = {
      -- stub messages
      messages = {
        {
          target = 'contract-foo-123',
          input = {
            ['function'] = 'noop'
          },
          tags = {
            { name = 'foo', value = 'bar' }
          }
        }
      },
      -- stub output
      output = 'foobar'
    }
  }
end

return contract
