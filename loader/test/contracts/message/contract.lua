-- Contract used in test
-- make sure to run ao build to rebuild the corresponding wasm
local contract = { _version = "0.0.1" }

local function handleMessage(state, _action, _SmartWeave)
  return { state }
end

local function noop(state, _action, SmartWeave)
  return {
    state = state,
    result = {
      messages = {
        {
          txId = SmartWeave.transaction.id,
          target = state.sendToContract,
          message = {
            type = "transfer",
            caller = SmartWeave.contract.id,
            qty = 10,
            from = SmartWeave.contract.id,
            to = state.sendToContract
          }
        }
      }
    }
  }
end

function contract.handle(state, action, SmartWeave)
  local handlers = {
    ['handleMessage'] = handleMessage,
    ['noop'] = noop
  }

  local handler = handlers[action.input['function']]

  if (handler == nil) then
    error('No function specified')
  end

  local response = handler(state, action, SmartWeave)
  return response
end

return contract
