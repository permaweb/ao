

function handle(state, action) {
    if (action.input.function === 'handleMessage') {
      state.balances[action.input.message.to] = action.input.message.qty;
      return { 
        state, 
        result: { 
            messages: [
                {
                  txId: SmartWeave.transaction.id, 
                  target: action.input.message.caller, 
                  message: { 
                    type: "received",
                    caller: SmartWeave.contract.id,
                  }
                }
            ]
        }  
      }
    }

    // {function: "handleMessage", message: {type: "transfer", from: "u contract address", qty: "qty", caller: "walletAddress"}}
    throw ContractError('No function specified')
}