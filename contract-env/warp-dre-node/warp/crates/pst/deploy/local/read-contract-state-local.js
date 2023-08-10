const { readContractState } = require('../scripts/read-contract-state');

readContractState(
  'localhost',
  1984,
  'http',
  'local',
  'deploy/local/wallet_local.json'
).finally();
