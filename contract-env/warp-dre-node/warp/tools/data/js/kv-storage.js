export async function handle(state, action) {
  const input = action.input;
  const caller = action.caller;

  if (!state.kvOps) {
    state.kvOps = {};
  }

  if (input.function === 'mint') {
    console.log('mint', input.target, input.qty.toString());
    await SmartWeave.kv.put(input.target, input.qty.toString());
    // for debug or whatever
    //state.kvOps[SmartWeave.transaction.id] = SmartWeave.kv.ops();
    return {state};
  }

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

    let callerBalance = await SmartWeave.kv.get(caller);
    callerBalance = callerBalance ? parseInt(callerBalance) : 0;

    if (callerBalance < qty) {
      throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
    }

    // Lower the token balance of the caller
    callerBalance -= qty;
    await SmartWeave.kv.put(caller, callerBalance.toString());

    let targetBalance = await SmartWeave.kv.get(target);
    targetBalance = targetBalance ? parseInt(targetBalance) : 0;

    targetBalance += qty;
    await SmartWeave.kv.put(target, targetBalance.toString());

    // for debug or whatever
    //state.kvOps[SmartWeave.transaction.id] = SmartWeave.kv.ops();

    return {state};
  }

  if (input.function === 'balance') {
    const target = input.target;
    const ticker = state.ticker;

    if (typeof target !== 'string') {
      throw new ContractError('Must specify target to get balance for');
    }

    console.log('balance', input.target);
    const result = await SmartWeave.kv.get(target);

    return {result: {target, ticker, balance: result ? parseInt(result) : 0}};
  }

  throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
}
