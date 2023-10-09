local contract = {
  _version = "0.0.1"
}

local function printTable(table, indent)
  indent = indent or 0

  for k, v in pairs(table) do
    if type(v) == "table" then
      print(string.rep("  ", indent) .. k .. " = {")
      printTable(v, indent + 1)
      print(string.rep("  ", indent) .. "}")
    else
      print(string.rep("  ", indent) .. k .. " = " .. tostring(v))
    end
  end
end

local function handleMessage(state, _action, _SmartWeave)
  return {state}
end

function contract.handle(state, action, SmartWeave)
  print("Running sender handle")

  state.count = state.count + 1
  -- do stuff
  local response = {
    state = state,
    result = {
      messages = {{
        target = state.receiverTx,
        message = {
          type = action.input['function'],
          caller = SmartWeave.contract.id,
          from = SmartWeave.contract.id,
          to = state.receiverTx
        }
      }}
    }
  }
  return response
end

return contract
