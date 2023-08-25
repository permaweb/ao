const fs = require('fs');
const { addFunds } = require('./addFunds');
const { generateWallet } = require('./create-testnet-wallet');

const path = require('path');

module.exports.loadWallet = async function (
  arweave,
  walletJwk,
  target,
  generated
) {
  let wallet;
  if (!generated) {
    await generateWallet(arweave, target);
  }

  try {
    wallet = JSON.parse(fs.readFileSync(path.join(walletJwk), 'utf-8'));
  } catch (e) {
    throw new Error('Wallet file not found! Please run deploy script first.');
  }

  if (target == 'testnet' || target == 'local') {
    await addFunds(arweave, wallet);
  }

  return wallet;
};

module.exports.walletAddress = async function (arweave, wallet) {
  return arweave.wallets.getAddress(wallet);
};
