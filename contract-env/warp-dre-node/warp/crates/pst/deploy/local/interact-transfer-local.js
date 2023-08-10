const { interactTransfer } = require('../scripts/interact-transfer');

interactTransfer(
  'localhost',
  1984,
  'http',
  'local',
  'deploy/local/wallet_local.json'
).finally();
