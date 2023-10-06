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

function contract.handle(state, action, SmartWeave)
  printTable(SmartWeave)

  -- do stuff
  local response = {
    state = state,
    result = {
      messages = {}
    }
  }
  return response
end

return contract
