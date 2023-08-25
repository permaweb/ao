/**
 */
export async function handle(state, action) {
  const _minimumStake = state.minimumStake;
  const _unstakePeriod = state.unstakePeriod;
  const _stakes = state.stakes;
  const tokenTxId = state.tokenTxId;

  const _input = action.input;
  const _msgSender = action.caller;

  if (_input.function === 'stake') {
    const amount = _input.amount;
    if (amount < _minimumStake) {
      throw new ContractError(`You must stake at least ${_minimumStake} tokens`);
    }

    // TODO: use "view" functions here
    const tokenState = await SmartWeave.contracts.readContractState(tokenTxId);
    if (!tokenState.allowances[_msgSender]) {
      throw new ContractError('Caller must increase their allowance');
    }

    if (tokenState.balances[_msgSender] < amount) {
      throw new ContractError('Cannot stake more token than you hold unstaked');
    }

    const allowance = tokenState.allowances[_msgSender][SmartWeave.contract.id];
    if (allowance < amount) {
      throw new ContractError('Caller must increase their allowance');
    }
    await SmartWeave.contracts.write(tokenTxId, {
      function: 'transferFrom',
      sender: _msgSender,
      recipient: SmartWeave.contract.id,
      amount
    });

    _stakes[_msgSender] = {
      amount: amount,
      unlockWhen: 0
    };

    return { state };
  }

  throw new ContractError(`No function supplied or function not recognised: "${_input.function}"`);
}
