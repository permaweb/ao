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

local function result(res)
  return assoc('error', { code = 123, message = "a handled error within the contract" }, res)
end

local function throw()
  return error({ code = 123, message = "a thrown error within the contract" })
end

local function unhandled()
  contract.field.does_not_exist = 'foo'
end

local actions = {}
actions['errorResult'] = result
actions['errorThrow'] = throw
actions['errorUnhandled'] = unhandled

function contract.handle(_state, action, SmartWeave)
  local res = actions[action.input['function']]({}, action, SmartWeave)

  return { result = res }
end

return contract
