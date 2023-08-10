export async function handle(state, action) {
  const input = action.input;
  const caller = action.caller;

  if (state.counter === undefined) {
    state.counter = 0;
  }

  if (input.function === 'mint') {
    await SmartWeave.kv.put('mint.' + input.target, input.qty);
    await SmartWeave.kv.put(input.target, input.qty);

    return {state};
  }

  if (input.function === 'writeCheck') {
    const target = input.target;
    const qty = input.qty;

    let callerBalance = await SmartWeave.kv.get(caller);
    callerBalance = callerBalance ? callerBalance : 0;

    if (callerBalance < qty) {
      throw new ContractError(`Caller balance ${callerBalance} not high enough to write check for ${qty}!`);
    }

    let sumChecks = 0;
    for await (let part of (await SmartWeave.kv.kvMap({ gte: `check.${caller}`, lt: `check.${caller}.\xff`})).values()) {
      sumChecks = sumChecks + part;
    }

    if (callerBalance < sumChecks + qty) {
      throw new ContractError(`Caller balance ${callerBalance} not high enough to write next check ${qty}!`);
    }

    let checkCounter = String(++state.counter).padStart(4, '0');

    await SmartWeave.kv.put(`history.check.${checkCounter}.${caller}.${target}`, qty);
    await SmartWeave.kv.put(`check.${caller}.${target}.${checkCounter}`, qty);

    return {state};
  }


  if (input.function === 'cashCheck') {
    const target = input.target;

    const firstPendingCheck =
      (await SmartWeave.kv.kvMap({ gte: `check.${target}.${caller}`, lt: `check.${target}.${caller}\xff`}))
        .entries().next()
    const firstPendingCheckKey = firstPendingCheck.value[0]
    const firstPendingCheckValue = firstPendingCheck.value[1]

    let targetBalance = await SmartWeave.kv.get(target);
    if (targetBalance < firstPendingCheckValue) {
      throw new ContractError(`Target balance ${targetBalance} not high enough to cash check for ${firstPendingCheckValue}!`);
    }
    targetBalance = targetBalance - firstPendingCheckValue;
    await SmartWeave.kv.put(target, targetBalance);

    let callerBalance = await SmartWeave.kv.get(caller);
    callerBalance = callerBalance + firstPendingCheckValue;
    await SmartWeave.kv.put(caller, callerBalance);

    await SmartWeave.kv.del(firstPendingCheckKey);

    return {state};
  }


  if (input.function === 'withdrawLastCheck') {
    const target = input.target;

    const lastCheck =
      (await SmartWeave.kv.kvMap({
        gte: `check.${caller}.${target}`,
        lt: `check.${caller}.${target}\xff`,
        reverse: true,
        limit: 1 })).keys().next().value

    await SmartWeave.kv.del(lastCheck);

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
    callerBalance = callerBalance ? callerBalance : 0;

    if (callerBalance < qty) {
      throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
    }

    // Lower the token balance of the caller
    callerBalance -= qty;
    await SmartWeave.kv.put(caller, callerBalance);

    let targetBalance = await SmartWeave.kv.get(target);
    targetBalance = targetBalance ? targetBalance : 0;

    targetBalance += qty;
    await SmartWeave.kv.put(target, targetBalance);

    return {state};
  }

  if (input.function === 'checksActive') {
    let sumChecks = 0;
    for await (let part of (await SmartWeave.kv.kvMap({ gte: `check.${caller}`, lt: `check.${caller}.\xff`})).values()) {
      sumChecks = sumChecks + parseInt(part);
    }

    return {result: {total: sumChecks ? sumChecks : 0}};
  }

  if (input.function === 'balance') {
    const target = input.target;
    const ticker = state.ticker;

    if (typeof target !== 'string') {
      throw new ContractError('Must specify target to get balance for');
    }

    const result = await SmartWeave.kv.get(target);

    return {result: {target, ticker, balance: result ? result : 0}};
  }

  if (input.function === 'minted') {
    let sumMinted = 0;
    for await (let part of (await SmartWeave.kv.kvMap({ gte: 'mint.', lt: 'mint.\xff'})).values()) {
      sumMinted = sumMinted + parseInt(part);
    }

    return {result: {minted: sumMinted}};
  }

  throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
}
