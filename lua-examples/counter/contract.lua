
local contract = { _version = "0.0.1" }

function contract.handle(state, action, SmartWeave) 
  -- do stuff
  local response = {
    state = state,
    result = { messages = {} }
  }
  return response
end

return contract
