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
  table.insert(state.received_messages, _action.input)

  return {
    state,
    result = {
      messages = {}
    }
  }
end

function contract.handle(state, action, SmartWeave)
  print("Running receiver handle")

  local handlers = {
    ['handleMessage'] = handleMessage
  }
  local handler = handlers[action.input['function']]

  if (handler == nil) then
    error('No function specified')
  end

  return handleMessage(state, action, SmartWeave)

  -- do stuff
end

return contract
