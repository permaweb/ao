local contract = {
  _version = "0.0.1"
}

local API = require('api.index')

function contract.handle(state, action, SmartWeave)
  local cases = {
    mint = 'mint',
    transfer = 'transfer',
    balance = 'balance'
  }
  local funk = cases[action.input['function']] or 'default'
  return API[funk](state, action, SmartWeave)
end

return contract
