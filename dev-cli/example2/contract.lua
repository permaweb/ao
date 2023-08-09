local contract = {}

function contract.handle(state, action, SmartWeave) 
  state.foo = 'BOOM'
  state.large = math.maxinteger - (math.maxinteger / 2)
  print(math.maxinteger)
  return { state = state }
end

return contract