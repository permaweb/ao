
const { 
  getLastStateBySortKey
} = require('../db/nodeDb');


module.exports = async (ctx) => {
  const txId = ctx.query.tx;
  const { nodeDb } = ctx;

  try {
    const response = {};

    let gatewayFetch = await fetch(`https://gateway.warp.cc/gateway/interactions/${txId}`);
    let gatewayData = await gatewayFetch.json();
    let sortkey= gatewayData['sortkey'];
    let cacheVal = await getLastStateBySortKey(nodeDb, sortkey);

    response.result = 'result' in cacheVal ? JSON.parse(cacheVal['result']) : [];

    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
