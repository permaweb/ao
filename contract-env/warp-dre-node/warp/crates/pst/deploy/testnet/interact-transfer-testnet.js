const { interactTransfer } = require('../scripts/interact-transfer');

interactTransfer(
  'testnet.redstone.tools',
  443,
  'https',
  'testnet',
  'deploy/testnet/wallet_testnet.json'
).finally();
