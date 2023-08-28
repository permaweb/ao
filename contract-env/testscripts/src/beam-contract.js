

function handle(state, action) {
    if (action.input.function === 'noop') {
      return { 
        state, 
        result: { 
            messages: [
                {
                  txId: SmartWeave.transaction.id, 
                  target: state.sendToContract, 
                  message: { 
                    type: "transfer",
                    caller: SmartWeave.contract.id,
                    qty: 10,
                    from: SmartWeave.contract.id,
                    to: state.sendToContract
                  }
                }
            ]
        }  
      }
    }
    if (action.input.function === 'handleMessage') {
      return { 
        state
      }
    }

    throw new ContractError('No function specified')
}