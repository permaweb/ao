local json = require "json"
local contract = require ".src.contract"

function handle(stateJSON, actionJSON, SmartWeaveJSON)
  -- decode inputs
  local state = json.decode(stateJSON)
  local action = json.decode(actionJSON)
  local SmartWeave = json.decode(SmartWeaveJSON)

  -- handle contract
  --
  -- The contract may throw an error, either intentionally or unintentionally
  -- So we need to be able to catch these unhandled errors and bubble them
  -- across the interop with some indication that it was unhandled
  --
  -- To do this, we wrap the contract.handle with pcall(), and return both the status
  -- and response as JSON. The caller can examine the status boolean and decide how to
  -- handle the error
  --
  -- See pcall https://www.lua.org/pil/8.4.html
  local status, response = pcall(function() return (contract.handle(state, action, SmartWeave)) end)

  -- encode output
  local responseJSON = json.encode({ ok = status, response = response })
  return responseJSON
end
