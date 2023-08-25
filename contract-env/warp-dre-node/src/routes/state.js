const { JSONPath } = require('jsonpath-plus');
const { getLastStateFromDreCache } = require('../db/nodeDb');

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const showValidity = ctx.query.validity === 'true';
  const showErrorMessages = ctx.query.errorMessages === 'true';
  const query = ctx.query.query;
  const nodeDb = ctx.nodeDb;

  try {
    const response = {};
    const result = await getLastStateFromDreCache(nodeDb, contractId);
    if (result) {
      response.contractTxId = contractId;
      response.sortKey = result.sort_key;
      response.timestamp = result.timestamp;
      response.signature = result.signature;
      response.stateHash = result.state_hash;
      response.manifest = JSON.parse(result.manifest);

      if (query) {
        response.result = JSONPath({ path: query, json: JSON.parse(result.state) });
      } else {
        response.state = JSON.parse(result.state);
      }

      if (showValidity) {
        response.validity = JSON.parse(result.validity);
      }

      if (showErrorMessages) {
        response.errorMessages = JSON.parse(result.error_messages);
      }
    } else {
      response.message = 'Contract not cached';
    }
    ctx.body = response;
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
