const { loadWallet } = require('./utils/load-wallet');
const { connectArweave } = require('./utils/connect-arweave');
const { connectPstContract } = require('./utils/connect-pst-contract');
const { contractTxId } = require('./utils/contract-tx-id');

module.exports.interactBalance = async function (
  host,
  port,
  protocol,
  target,
  walletJwk
) {
  const arweave = connectArweave(host, port, protocol);
  const wallet = await loadWallet(arweave, walletJwk, target, true);

  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  const txId = contractTxId(target);
  const pst = await connectPstContract(arweave, wallet, txId, target);
  const balance = await pst.currentBalance(walletAddress);

  console.log(balance);
};
