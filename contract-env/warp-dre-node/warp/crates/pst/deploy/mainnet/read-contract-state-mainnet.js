const { readContractState } = require('../scripts/read-contract-state');

readContractState(
  'arweave.net',
  443,
  'https',
  'mainnet',
  'deploy/mainnet/wallet_mainnet.json'
).finally();
