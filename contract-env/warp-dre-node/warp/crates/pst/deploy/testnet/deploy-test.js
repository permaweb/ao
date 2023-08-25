const { deploy } = require('../scripts/deploy');

deploy(
  'arweave.net',
  443,
  'https',
  'testnet',
  'deploy/testnet/wallet_testnet.json'
).finally();
