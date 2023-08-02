const fs = require('fs');
const path = require('path');
const WebSocketClient = require('websocket').client;

(async () => {
  const rawContracts = fs.readFileSync(path.join('safeContracts.json'), 'utf-8');
  let contracts = JSON.parse(rawContracts);

  const client = new WebSocketClient();
  client.on('connectFailed', function (error) {
    console.log(error);
    console.log('Connect Error: ' + error.toString());
  });
  client.on('connect', async (connection) => {
    contracts = contracts.slice(0, 1);
    console.log('WebSocket Client Connected');
    connection.on('error', function (error) {
      console.log('Connection Error: ' + error.toString());
    });
    connection.on('close', function () {
      console.log('echo-protocol Connection Closed');
    });

    for (let contract of contracts) {
      console.log('Publishing', contract);
      const message = { contractTxId: contract.contract_id, test: false, interaction: {} };
      // publisher.publish(channel, JSON.stringify(message));
      connection.sendUTF(JSON.stringify(message));

      console.log('Published %s to %s', contract.contract_id);
    }
    console.log('Sent %d contracts', contracts.length);
    process.exit(0);
  });

  let streamId = '0xc2ae2d5523080b64cc788cddc91ff59a3e29f911/common';
  let port = 7180;
  let url = `ws://write.streamr.warp.cc`;
  // let url = `ws://redstone-nlb-prod-b3c531f79942790e.elb.eu-central-1.amazonaws.com`;
  let requestUrl = `${url}:${port}/streams/${encodeURIComponent(
    streamId
  )}/publish?apiKey=YjZhODI3MzRiMzA3NDlkNGIxYjVmYjllMmE4MzViZWI`;
  client.connect(requestUrl);
})();
