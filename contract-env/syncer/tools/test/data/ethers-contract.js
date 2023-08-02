export async function handle(state, action) {
  const input = action.input;

  if (input.function == 'ethers') {
    const signingAddress = SmartWeave.extensions.ethers.utils.verifyMessage(input.message, input.signature);

    if (signingAddress == input.signingAddress) {
      state.count += 1;
    } else {
      throw new ContractError(`Invalid EVM signature.`);
    }

    return { state };
  }

  throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
}
