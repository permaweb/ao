

function handle(state, action) {
    if (action.input.function === 'noop') {
      return { 
        state, 
        result: { 
            messages: [
                {caller: "fake", txId: "fake2"}
            ]
        }  
      }
    }
    throw ContractError('No function specified')
}