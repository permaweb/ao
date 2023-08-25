const { deploy } = require('../scripts/deploy');

deploy(
  'arweave.net',
  443,
  'https',
  'mainnet',
  'deploy/mainnet/wallet_mainnet.json'
).finally();
