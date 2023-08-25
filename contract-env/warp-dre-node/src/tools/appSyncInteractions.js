const { initPubSub, subscribe } = require('warp-contracts-pubsub');
global.WebSocket = require('ws');

initPubSub();
async function sub() {
  const contractTxId = 'r6kmp2NjdUyjBEZiVx4BeNSaaSLx_EUNVZhKKQ-JBGs';

  const subscription = await subscribe(
    `interactions/${contractTxId}`,
    ({ data }) => {
      const interaction = JSON.parse(data);
      console.log('\n ==== new message ==== ', interaction.sortKey);
      console.dir(interaction);
    },
    console.error
  );
  console.log('waiting for messages...', contractTxId);
}

sub()
  .then()
  .catch((e) => {
    console.error(e);
  });
