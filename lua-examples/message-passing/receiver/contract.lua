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
  print("Receiver action")
  printTable(_action)
  state.count = state.count + 1

  return {
    state,
    result = {
      messages = {}
    }
  }
end

function contract.handle(state, action, SmartWeave)
  state.count = state.count + 1
  table.insert(state.received_messages, action.input)
  printTable(state)
  return {
    state = state,
    result = {
      messages = {}
    }
  }
end

return contract
