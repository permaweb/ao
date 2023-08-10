export async function handle(state, action) {
  if (action.input.function === 'writeContract') {
    const value = await SmartWeave.contracts.write(action.input.contractId, {
      function: 'addAmount',
      amount: action.input.amount
    });
    logger.debug('Internal write result', value);
    return { state };
  }

  if (action.input.function === 'writeContractAutoThrow') {
    await SmartWeave.contracts.write(action.input.contractId, {
      function: 'justThrow',
    });
    if (state.errorCounter === undefined) {
      state.errorCounter = 0;
    }
    state.errorCounter++;
    return { state };
  }
  if (action.input.function === 'writeContractForceAutoThrow') {
    await SmartWeave.contracts.write(action.input.contractId, {
      function: 'justThrow',
    }, true);
    if (state.errorCounter === undefined) {
      state.errorCounter = 0;
    }
    state.errorCounter++;
    return { state };
  }
  if (action.input.function === 'writeContractForceNoAutoThrow') {
    await SmartWeave.contracts.write(action.input.contractId, {
      function: 'justThrow',
    }, false);
    if (state.errorCounter === undefined) {
      state.errorCounter = 0;
    }
    state.errorCounter++;
    return { state };
  }
  if (action.input.function === 'writeContractManualThrow') {
    const result = await SmartWeave.contracts.write(action.input.contractId, {
      function: 'justThrow',
    });
    return { state };
  }

  if (action.input.function === 'writeInDepth') {
    const value1 = await SmartWeave.contracts.write(action.input.contractId1, {
      function: 'addAmountDepth',
      amount: action.input.amount,
      contractId: action.input.contractId2
    });

    logger.debug('Internal write result', { value1: value1.state });
    return { state };
  }

  if (action.input.function === 'writeMultiContract') {
    const value1 = await SmartWeave.contracts.write(action.input.contractId1, {
      function: 'addAmount',
      amount: action.input.amount
    });

    const value2 = await SmartWeave.contracts.write(action.input.contractId2, {
      function: 'addAmount',
      amount: action.input.amount
    });
    logger.debug('Internal write result', { value1: value1.state, value2: value2.state });
    return { state };
  }

  if (action.input.function === 'writeContractCheck') {
    const calleeState = await SmartWeave.contracts.readContractState(action.input.contractId);
    if (calleeState.counter > 600) {
      const result = await SmartWeave.contracts.write(action.input.contractId, {
        function: 'addAmount',
        amount: -action.input.amount
      });
      state.counter += result.state.counter;
    } else {
      const result = await SmartWeave.contracts.write(action.input.contractId, {
        function: 'addAmount',
        amount: action.input.amount
      });
      state.counter += result.state.counter;
    }

    return { state };
  }

  if (action.input.function === 'writeBack') {
    const result = await SmartWeave.contracts.write(action.input.contractId, {
      function: 'addAndWrite',
      amount: action.input.amount,
      contractId: SmartWeave.contract.id
    });

    state.counter += result.state.counter;

    return { state };
  }

  if (action.input.function === 'writeBackCheck') {
    const result = await SmartWeave.contracts.write(action.input.contractId, {
      function: 'addAndWrite',
      amount: action.input.amount,
      contractId: SmartWeave.contract.id
    });

    // Since contractB changes state of this contract (in add-and-write function)
    // we need to refresh the state here manually.
    state = await SmartWeave.contracts.refreshState();

    console.log('State after refresh', state);

    if (result.state.counter > 2059) {
      state.counter -= result.state.counter;
    } else {
      state.counter += result.state.counter;
    }

    return { state };
  }

  if (action.input.function === 'addAmount') {
    state.counter += action.input.amount;
    return { state };
  }
}
