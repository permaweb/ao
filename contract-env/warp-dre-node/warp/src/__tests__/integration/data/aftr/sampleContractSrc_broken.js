async function handle(state, action) {
  const balances = state.balances;
  const input = action.input;
  const caller = action.caller;
  let target = "";
  let balance = 0;

  if (input.function === "balance") {
    target = isArweaveAddress(input.target || caller);
    if (typeof target !== "string") {
      throw new ContractError("Must specificy target to get balance for.");
    }
    balance = 0;
    if (target in balances) {
      balance = balances[target];
    }
  }

  if (input.function === "transfer") {
    const target2 = input.target;
    const qty = input.qty;
    const callerAddress = isArweaveAddress(caller);
    const targetAddress = isArweaveAddress(target2);
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer.');
    }
    if (!targetAddress) {
      throw new ContractError("No target specified.");
    }
    if (qty <= 0 || callerAddress === targetAddress) {
      throw new ContractError("Invalid token transfer.");
    }
    if (!(callerAddress in balances)) {
      throw new ContractError("Caller doesn't own a balance in the Vehicle.");
    }
    if (balances[callerAddress] < qty) {
      throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
    }
    if (SmartWeave.contract.id === target2) {
      throw new ContractError("A vehicle token cannot be transferred to itself because it would add itself the balances object of the vehicle, thus changing the membership of the vehicle without a vote.");
    }
    if (state.ownership === "single" && callerAddress === state.creator && balances[callerAddress] - qty <= 0) {
      throw new ContractError("Invalid transfer because the creator's balance would be 0.");
    }
    balances[callerAddress] -= qty;
    if (targetAddress in balances) {
      balances[targetAddress] += qty;
    } else {
      balances[targetAddress] = qty;
    }
  }
  if (input.function === "mint") {
    if (!input.qty) {
      throw new ContractError("Missing qty.");
    }
    if (!(caller in state.balances)) {
      balances[caller] = input.qty;
    }
  }
  if (input.function === "deposit") {
    if (!input.txID) {
      throw new ContractError("The transaction is not valid.  Tokens were not transferred to the vehicle.");
    }
    if (!input.tokenId) {
      throw new ContractError("No token supplied. Tokens were not transferred to the vehicle.");
    }
    if (input.tokenId === SmartWeave.contract.id) {
      throw new ContractError("Deposit not allowed because you can't deposit an asset of itself.");
    }
    if (!input.qty || typeof +input.qty !== "number" || +input.qty <= 0) {
      throw new ContractError("Qty is invalid.");
    }
    let lockLength = 0;
    if (input.lockLength) {
      lockLength = input.lockLength;
    }

    await SmartWeave.contracts.write(input.tokenId, {
      function: "claim",
      txID: input.txID,
      qty: input.qty
    });

    // note: getTokenInfo underneath makes a readContractState on input.tokenId
    // the SDK should now throw in such case (i.e. making a read on a contract on which
    // we've just made write).
    const tokenInfo = await getTokenInfo(input.tokenId);
    const txObj = {
      txID: input.txID,
      tokenId: input.tokenId,
      source: caller,
      balance: input.qty,
      start: SmartWeave.block.height,
      name: tokenInfo.name,
      ticker: tokenInfo.ticker,
      logo: tokenInfo.logo,
      lockLength
    };
    if (!state.tokens) {
      state["tokens"] = [];
    }
    state.tokens.push(txObj);
  }
  if (input.function === "allow") {
    target = input.target;
    const quantity = input.qty;
    if (!Number.isInteger(quantity) || quantity === void 0) {
      throw new ContractError("Invalid value for quantity. Must be an integer.");
    }
    if (!target) {
      throw new ContractError("No target specified.");
    }
    if (quantity <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer.");
    }
    if (balances[caller] < quantity) {
      throw new ContractError("Caller balance not high enough to make claimable " + quantity + " token(s).");
    }
    balances[caller] -= quantity;
    if (balances[caller] === null || balances[caller] === void 0) {
      balances[caller] = 0;
    }
    state.claimable.push({
      from: caller,
      to: target,
      qty: quantity,
      txID: SmartWeave.transaction.id
    });
  }
  if (input.function === "claim") {
    const txID = input.txID;
    const qty = input.qty;
    if (!state.claimable.length) {
      throw new ContractError("Contract has no claims available.");
    }
    let obj, index;
    for (let i = 0; i < state.claimable.length; i++) {
      if (state.claimable[i].txID === txID) {
        index = i;
        obj = state.claimable[i];
      }
    }
    if (obj === void 0) {
      throw new ContractError("Unable to find claim.");
    }
    if (obj.to !== caller) {
      throw new ContractError("Claim not addressed to caller.");
    }
    if (obj.qty !== qty) {
      throw new ContractError("Claiming incorrect quantity of tokens.");
    }
    for (let i = 0; i < state.claims.length; i++) {
      if (state.claims[i] === txID) {
        throw new ContractError("This claim has already been made.");
      }
    }
    if (!balances[caller]) {
      balances[caller] = 0;
    }
    balances[caller] += obj.qty;
    state.claimable.splice(index, 1);
    state.claims.push(txID);
  }


  if (input.function === "balance") {
    let vaultBal = 0;
    try {
      for (let bal of state.vault[caller]) {
        vaultBal += bal.balance;
      }
    } catch (e) {
    }
    return {result: {target, balance, vaultBal}};
  } else {
    return {state};
  }
}

function isArweaveAddress(addy) {
  const address = addy.toString().trim();
  if (!/[a-z0-9_-]{43}/i.test(address)) {
    throw new ContractError("Invalid Arweave address.");
  }
  return address;
}

async function getTokenInfo(contractId) {
  const assetState = await SmartWeave.contracts.readContractState(contractId);
  const settings = new Map(assetState.settings);
  return {
    name: currentTokenState.name,
    ticker: currentTokenState.ticker,
    logo: settings.get("communityLogo")
  };
}
