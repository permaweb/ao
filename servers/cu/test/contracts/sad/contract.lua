-- This contract is published to Arweave for the purpose of testing
-- the SDK end to end, specifically when an error occurs. If you alter this contract code, be sure
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

local function counter(state)
  return assoc('counter', state.counter + 1, state), nil
end

local function result(res)
  return nil, assoc('error', { code = 123, message = "a handled error within the contract" }, res)
end

local function throw()
  return error({ code = 123, message = "a thrown error within the contract" })
end

local function unhandled()
  contract.field.does_not_exist = 'foo'
end

local actions = {}
actions['counter'] = counter
actions['errorResult'] = result
actions['errorThrow'] = throw
actions['errorUnhandled'] = unhandled

function contract.handle(state, message, AoGlobal)
  local func = message.tags['function']

  if func == nil then return error({ code = 500, message = 'no function tag in the message'}) end

  local newState, newResult = actions[func](state, message, AoGlobal)

  return { state = newState, result = newResult }
end

return contract
