export async function handle(state, action) {
  const balances = state.balances;
  const canEvolve = state.canEvolve;
  const input = action.input;
  const caller = action.caller;

  if (input.function === 'train') {
    const manager = new SmartWeave.extensions.NlpManager({languages: ['en'], forceNER: true});
    manager.addDocument('en', 'goodbye for now', 'greetings.bye');
    manager.addDocument('en', 'bye bye take care', 'greetings.bye');
    manager.addDocument('en', 'okay see you later', 'greetings.bye');
    manager.addDocument('en', 'bye for now', 'greetings.bye');
    manager.addDocument('en', 'i must go', 'greetings.bye');
    manager.addDocument('en', 'hello', 'greetings.hello');
    manager.addDocument('en', 'hi', 'greetings.hello');
    manager.addDocument('en', 'howdy', 'greetings.hello');

    manager.addAnswer('en', 'greetings.bye', 'Till next time');
    manager.addAnswer('en', 'greetings.bye', 'see you soon!');
    manager.addAnswer('en', 'greetings.hello', 'Hey there!');
    manager.addAnswer('en', 'greetings.hello', 'Greetings!');

    await manager.train();
    manager.save();
    const response = await manager.process('en', 'I should go now');
    state.nlp = response;
    return {
      state
    };
  }

  if (input.function === 'require') {
    const fs = require('fs');
    console.log(fs);
  }

  if (input.function === 'storeBalance') {
    const target = input.target;
    const height = SmartWeave.block.height;
    if (state.wallets.height === undefined) {
      state.wallets[height] = {};
    }
    state.wallets[height][target] = await SmartWeave.arweave.wallets.getBalance(target);

    return {state};
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

    if (balances[caller] < qty) {
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

  if (input.function === 'evolve' && canEvolve) {
    if (state.owner !== caller) {
      throw new ContractError('Only the owner can evolve a contract.');
    }

    state.evolve = input.value;

    return {state};
  }

  if (input.function === 'origin') {
    if (!state.origins) {
      state.origins = {};
    }
    state.origins[SmartWeave.transaction.id] = SmartWeave.transaction.origin;
    return {state};
  }


  throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
}
