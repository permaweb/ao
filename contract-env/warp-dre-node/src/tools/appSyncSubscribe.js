const { initPubSub, subscribe } = require('warp-contracts-pubsub');
const { diff, detailedDiff } = require('deep-object-diff');
global.WebSocket = require('ws');

initPubSub();
async function sub() {
  const contractTxId = 'FnaxqvRN5neyArFpVs33uxjJLaaZ2yU0_rrRyD03ry0';

  let prevState = {};

  const subscription = await subscribe(
    contractTxId,
    ({ data }) => {
      const newState = JSON.parse(data);
      console.log('\n ==== new message ==== ', newState.sortKey);
      console.dir(newState);
      prevState = newState.state;
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
