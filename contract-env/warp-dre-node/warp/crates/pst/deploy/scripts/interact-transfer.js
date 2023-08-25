const { loadWallet } = require('./utils/load-wallet');
const { connectArweave } = require('./utils/connect-arweave');
const { connectPstContract } = require('./utils/connect-pst-contract');
const { contractTxId } = require('./utils/contract-tx-id');
const { mineBlock } = require('./utils/mine-block');

module.exports.interactTransfer = async function (host, port, protocol, target, walletJwk) {
  const arweave = connectArweave(host, port, protocol);
  const wallet = await loadWallet(arweave, walletJwk, target, true);
  const txId = contractTxId(target);
  const pst = await connectPstContract(arweave, wallet, txId, target);

  const transferId = await pst.transfer({
    target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
    qty: 555,
  });

  await mineBlock(arweave);
  const state = await pst.currentState();

  console.log('Updated state:', state);
  console.log('Contract tx id', txId);

  if (target == 'testnet') {
    console.log(`Check transfer interaction at https://sonar.warp.cc/#/app/interaction/${transferId}?network=testnet`);
  } else {
    console.log('Transfer tx id', transferId);
  }
};
