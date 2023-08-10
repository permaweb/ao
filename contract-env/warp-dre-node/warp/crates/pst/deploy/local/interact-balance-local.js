const { interactBalance } = require('../scripts/interact-balance');

interactBalance(
  'localhost',
  1984,
  'http',
  'local',
  'deploy/local/wallet_local.json'
).finally();
