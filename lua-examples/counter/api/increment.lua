local Main = {}

function Main.increment(state, action, SmartWeave)
  print("increment")
  local response = {
    state = state,
    result = { messages = {} }
  }
  return response
end

return Main