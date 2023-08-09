local contract = {}

function contract.handle(state, action, SmartWeave) 
  state.foo = 'BOOM'
  return { state = state }
end

return contract