const { interactBalance } = require('../scripts/interact-balance');

interactBalance(
  'testnet.redstone.tools',
  443,
  'https',
  'testnet',
  'deploy/testnet/wallet_testnet.json'
).finally();
