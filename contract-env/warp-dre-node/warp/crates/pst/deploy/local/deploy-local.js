const { deploy } = require('../scripts/deploy');

deploy(
  'localhost',
  1984,
  'http',
  'local',
  'deploy/local/wallet_local.json'
).finally();
