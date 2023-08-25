(() => {
    // src/thetAR/actions/read/userOrder.ts
    var create = async (state, action) => {
      const param = action.input.params;

      const tokenState = await SmartWeave.contracts.readContractState(state.token);
      //let orderQuantity = param.price;
      let orderQuantity = tokenState.allowances[action.caller][SmartWeave.contract.id];
      logger.error("  CREATE Taking tokens: " + orderQuantity);
      await SmartWeave.contracts.write(state.token, { function: "transferFrom", sender: action.caller, recipient: SmartWeave.contract.id, amount: orderQuantity });
      state.orders.push(orderQuantity);
      
      //await SmartWeave.contracts.readContractState(state.token);
      return { state };
    };

    var cancel = async (state, action) => {
        const param = action.input.params;
 
        let orderQuantity = state.orders[param.orderId];
        logger.error("CANCEL Returning tokens: " + orderQuantity);
        await SmartWeave.contracts.write(state.token, { function: "transfer", to: action.caller, amount: orderQuantity });

        state.orders.splice(param.orderId, 1);
        return { state };
      };
  
    // src/thetAR/contract.ts
    async function handle(state, action) {
      const func = action.input.function;
      switch (func) {
        case "create":
          return await create(state, action);
        case "cancel":
          return await cancel(state, action);
        default:
          throw new ContractError(`No function supplied or function not recognised: "${func}"`);
      }
    }
  })();
  