-- This contract has already been built and published
-- at dfccC-_ih0Xl2_zhj8pTIUZF03QNfV2xu68pVzxSIQ0
-- but is kept here for posterity
local contract = { _version = "0.0.1" }

function contract.handle(state, action, SmartWeave) 
  if action.input['function'] == "send" then
    return {
      state = state,
      result = {
        message = {
          target = action.input.target,
          message = {
            "function" = "notify",
            text = action.input.text
          }
        }
      }
    }
  end

  if action.input['function'] == 'notify' then
    if state["inbox"] == nil then
      state["inbox"] = {}
    end

    state.inbox.insert({ caller = action.caller, text = action.input.text })
    return { state = state }
  end

  return { result = { error = "function not found!" }}
end

return contract
