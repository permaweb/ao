const { interactBalance } = require('../scripts/interact-balance');

interactBalance(
  'arweave.net',
  443,
  'https',
  'mainnet',
  'deploy/mainnet/wallet_mainnet.json'
).finally();
