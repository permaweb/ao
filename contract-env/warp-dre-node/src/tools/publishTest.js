const Redis = require('ioredis');
const { config } = require('../config');

(async () => {
  const connectionOptions = config.gwPubSubConfig;

  const publisher = new Redis(connectionOptions);
  await publisher.connect();
  console.log(publisher.status);

  // QAjM3_MklqXSXr-7z_J7t0UqEAyjBpqQDF9NDzf_JPU
  // 5dV4R2zESiRHQjN6xVt7-NGWSbL5aLaDBV52tlRyFbg
  // mS6mBLQ4HmWAqiVs4Nhs3DEpjk3PZCrR6yUOosTSKa8
  // XIutiOKujGI21_ywULlBeyy-L9d8goHxt0ZyUayGaDg

  const message = { contractTxId: 'Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY', test: true, interaction: {} };
  // const message = { contractTxId: '5Yt1IujBmOm1LSux9KDUTjCE7rJqepzP7gZKf_DyzWI', test: true, interaction: {} };
  // const message = { contractTxId: '5dV4R2zESiRHQjN6xVt7-NGWSbL5aLaDBV52tlRyFbg', test: true, initialState: {"kupa": "gowna"} };
  const channel = `contracts`;

  publisher.publish(channel, JSON.stringify(message));
  console.log('Published %s to %s', message, channel);
})();
