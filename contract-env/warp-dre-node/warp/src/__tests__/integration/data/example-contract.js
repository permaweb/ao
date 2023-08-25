export async function handle(state, action) {
  if (state.counter === undefined) {
    state.counter = 0;
  }
  if (action.input.function === 'div') {
    state.counter = state.counter / 2;
    return { state };
  }

  if (action.input.function === 'add') {
    state.counter++;
    return { state };
  }

  if (action.input.function === 'addAndWrite') {
    const result = await SmartWeave.contracts.write(action.input.contractId, {
      function: 'addAmount',
      amount: action.input.amount
    });

    state.counter += result.state.counter;

    return { state };
  }

  if (action.input.function === 'addAmount') {
    state.counter += action.input.amount;

    return { state };
  }
  if (action.input.function === 'addAmountDepth') {
    state.counter += action.input.amount;
    await SmartWeave.contracts.write(action.input.contractId, {
      function: 'addAmount',
      amount: action.input.amount + 20
    });
    return { state };
  }

  if (action.input.function === 'value') {
    return { result: state.counter };
  }
  if (action.input.function === 'blockHeight') {
    return { result: SmartWeave.block.height };
  }
  if (action.input.function === 'readContract2') {
    const id = action.input.contractId;
    const value = SmartWeave.contracts.readContractState(id);
    return { result: value };
  }
  if (action.input.function === 'justThrow') {
    throw new ContractError('Error from justThrow function');
  }
}
