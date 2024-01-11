local mint_mod = require('api.mint')
local transfer_mod = require('api.transfer')
local balance_mod = require('api.balance')

API = {}

API.mint = mint_mod.mint;
API.transfer = transfer_mod.transfer;
API.balance = balance_mod.balance;

function API.default(state, action, SmartWeave)
  local funk = action.input['function'] or 'undefined'
  return {
    result = {
      error = "No function supplied or function not recognized. " .. funk
    }
  }
end

return API;
