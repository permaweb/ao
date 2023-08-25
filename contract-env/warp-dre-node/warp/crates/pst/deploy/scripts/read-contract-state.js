const { loadWallet } = require('./utils/load-wallet');
const { connectArweave } = require('./utils/connect-arweave');
const { connectContract } = require('./utils/connect-contract');
const { contractTxId } = require(`./utils/contract-tx-id`);

module.exports.readContractState = async function (
  host,
  port,
  protocol,
  target,
  walletJwk
) {
  const arweave = connectArweave(host, port, protocol);
  const wallet = await loadWallet(arweave, walletJwk, target, true);

  const txId = contractTxId(target);
  const contract = await connectContract(arweave, wallet, txId, target);
  const { cachedValue } = await contract.readState();

  console.log('Current state:', cachedValue.state);
  console.log('Contract tx id', txId);
};
