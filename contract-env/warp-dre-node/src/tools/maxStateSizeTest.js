const Redis = require('ioredis');
const { config } = require('../config');


(async () => {
  const connectionOptions = config.gwPubSubConfig;

  const publisher = new Redis(connectionOptions);
  await publisher.connect();
  console.log(publisher.status);
  const message = {
    contractTxId: 'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY',
    test: true,
    initialState: {
      foo: 'x'.repeat(3 * 1024 * 1024)
    }
  };
  const channel = `contracts`;

  publisher.publish(channel, JSON.stringify(message));
  console.log('Published to %s', channel);
})();
