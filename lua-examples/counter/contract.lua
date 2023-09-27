
local contract = { _version = "0.0.1" }
local API = require('api.index')


function contract.handle(state, action, SmartWeave)
  -- do stuff
  API.send();
  print('test')
  local response = {
    state = state,
    result = { messages = {} }
  }
  return response
end

function contract.sum(num)
  return num * 2
end

return contract
