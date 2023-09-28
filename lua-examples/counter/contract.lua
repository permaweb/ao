local contract = {
  _version = "0.0.1"
}
local API = require('api.index')

function contract.handle(state, action, SmartWeave)
  -- do stuff
  API.send();
end

function contract.sum(num)
  return num * 2
end

function contract.handleExample(state, action, SmartWeave)
  local cases = {
    increment = API.increment,
    decrement = API.decrement,
    default = function()
      print("Invalid")
    end
  }

  local execute = cases[action.input['function']] or cases.default
  return execute(state, action, SmartWeave)
end

return contract
