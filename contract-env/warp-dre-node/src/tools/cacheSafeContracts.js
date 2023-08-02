const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');

(async () => {
  const rawContracts = fs.readFileSync(path.join('safeContracts.json'), 'utf-8');
  let contracts = JSON.parse(rawContracts);

  const publisher = new Redis(config.gwPubSubConfig);
  await publisher.connect();
  console.log(publisher.status);
  const channel = `contracts`;

  // contracts = contracts.slice(0, 10);

  for (let contract of contracts) {
    console.log('Publishing', contract);
    const message = { contractTxId: contract.contract_id, test: true, interaction: {} };
    publisher.publish(channel, JSON.stringify(message));
    console.log('Published %s to %s', contract.contract_id, channel);
  }
  publisher.disconnect();
})();
