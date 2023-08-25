const { interactTransfer } = require('../scripts/interact-transfer');

interactTransfer(
  'arweave.net',
  443,
  'https',
  'mainnet',
  'deploy/mainnet/wallet_mainnet.json'
).finally();
