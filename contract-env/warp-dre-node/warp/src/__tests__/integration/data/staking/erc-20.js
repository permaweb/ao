/**
 * This is an example token contract that mimics the
 * allowance/transferFrom features from ERC-20.
 *
 * note: most validations have been removed for code brevity.
 */
export function handle(state, action) {
  const _balances = state.balances;
  const _allowances = state.allowances;

  const _input = action.input;
  const _msgSender = action.caller;

  if (_input.function === 'transfer') {
    const recipient = _input.recipient;
    const amount = _input.amount;

    return _transfer(_msgSender, recipient, amount);
  }

  if (_input.function === 'approve') {
    const spender = _input.spender;
    const amount = _input.amount;

    if (!_allowances[_msgSender]) {
      _allowances[_msgSender] = {};
    }

    _allowances[_msgSender][spender] = amount;

    return { state };
  }

  if (_input.function === 'mint') {
    const account = _input.account;
    const amount = _input.amount;

    state.totalSupply += amount;
    if (account in _balances) {
      _balances[account] += amount;
    } else {
      _balances[account] = amount;
    }

    return { state };
  }

  if (_input.function === 'burn') {
    const account = _input.account;
    const amount = _input.amount;
    if (_balances[account] < amount) {
      throw new ContractError(`Burn amount exceeds balance`);
    }

    _balances[account] -= amount;
    state.totalSupply -= amount;
    return { state };
  }

  if (_input.function === 'allowance') {
    const owner = _input.owner;
    const spender = _input.spender;
    let allowance = 0;
    if (_allowances[owner] && _allowances[owner][spender]) {
      allowance = _allowances[owner][spender];
    }

    return { result: allowance };
  }

  if (_input.function === 'transferFrom') {
    const sender = _input.sender;
    const recipient = _input.recipient;
    const amount = _input.amount;

    if (amount == 0 ) {
      throw new ContractError('TransferFromZero');
    }

    const currentAllowance = _allowances[sender][_msgSender];

    if (currentAllowance === undefined || currentAllowance < amount) {
      throw new ContractError(`Transfer amount exceeds allowance`);
    }

    _allowances[sender][_msgSender] -= amount;

    return _transfer(sender, recipient, amount);
  }

  if (_input.function === 'balance') {
    const target = _input.target;
    const ticker = state.ticker;

    return { result: { target, ticker, balance: _balances[target] } };
  }

  throw new ContractError(`No function supplied or function not recognised: "${_input.function}"`);

  function _transfer(sender, recipient, amount) {
    if (amount <= 0 || sender === recipient) {
      throw new ContractError('Invalid token transfer');
    }

    if (_balances[sender] < amount) {
      throw new ContractError(`Caller balance not high enough to send ${amount} token(s)!`);
    }

    _balances[sender] -= amount;
    if (recipient in _balances) {
      _balances[recipient] += amount;
    } else {
      _balances[recipient] = amount;
    }

    return { state };
  }
}
