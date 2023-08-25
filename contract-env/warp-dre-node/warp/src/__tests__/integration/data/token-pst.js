export async function handle(state, action) {
  const balances = state.balances;
  const canEvolve = state.canEvolve;
  const input = action.input;
  const caller = action.caller;

  if (input.function === 'transfer') {
    const target = input.target;
    const qty = input.qty;

    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }

    if (!target) {
      throw new ContractError('No target specified');
    }

    if (qty <= 0 || caller === target) {
      throw new ContractError('Invalid token transfer');
    }

    if (!balances[caller] || balances[caller] < qty) {
      throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
    }

    // Lower the token balance of the caller
    balances[caller] -= qty;
    if (target in balances) {
      // Wallet already exists in state, add new tokens
      balances[target] += qty;
    } else {
      // Wallet is new, set starting balance
      balances[target] = qty;
    }

    return {state};
  }

  if (input.function === 'balance') {
    const target = input.target;
    const ticker = state.ticker;

    if (typeof target !== 'string') {
      throw new ContractError('Must specify target to get balance for');
    }

    if (typeof balances[target] !== 'number') {
      throw new ContractError('Cannot get balance, target does not exist');
    }

    return {result: {target, ticker, balance: balances[target]}};
  }

  if (input.function === 'vrf') {
    if (!state.vrf) {
      state.vrf = {};
    }

    state.vrf[SmartWeave.transaction.id] = {
      vrf: SmartWeave.vrf.data,
      value: SmartWeave.vrf.value,

      random_6_1: SmartWeave.vrf.randomInt(6),
      random_6_2: SmartWeave.vrf.randomInt(6),
      random_6_3: SmartWeave.vrf.randomInt(6),

      random_12_1: SmartWeave.vrf.randomInt(12),
      random_12_2: SmartWeave.vrf.randomInt(12),
      random_12_3: SmartWeave.vrf.randomInt(12),

      random_46_1: SmartWeave.vrf.randomInt(46),
      random_46_2: SmartWeave.vrf.randomInt(46),
      random_46_3: SmartWeave.vrf.randomInt(46),

      random_99_1: SmartWeave.vrf.randomInt(99),
      random_99_2: SmartWeave.vrf.randomInt(99),
      random_99_3: SmartWeave.vrf.randomInt(99),
    }

    return {state};
  }

  if (input.function === 'evolve' && canEvolve) {
    if (state.owner !== caller) {
      throw new ContractError('Only the owner can evolve a contract.');
    }

    state.evolve = input.value;

    return {state};
  }

  if (input.function === 'readForeign') {
    if (state.foreignCallsCounter === undefined) {
      state.foreignCallsCounter = 0;
    }
    const result = await SmartWeave.contracts.readContractState(input.contractTxId, true);
    state.foreignCallsCounter++; // this should not happen for unsafe contracts when skipUnsafe is set to true
    return {state};
  }

  if (input.function === 'writeForeign') {
    console.log('writeForeign');
    const result = await SmartWeave.contracts.write(input.contractTxId, {
      function: "callFromForeign"
    });
    return {state};
  }

  if (input.function === 'callFromForeign') {
    console.log('callFromForeign');
    if (state.foreignCallsCounter === undefined) {
      state.foreignCallsCounter = 0;
    }
    state.foreignCallsCounter++;
    return {state};
  }

  throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
}
