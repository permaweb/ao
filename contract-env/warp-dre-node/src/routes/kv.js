const warp = require('../warp');

module.exports = async (ctx) => {
  const contractId = ctx.query.id;
  const keys = ctx.query.keys.split(',');

  try {
    if (!isTxIdValid(contractId)) {
      throw new Error('Invalid tx format');
    }
    const result = await warp.contract(contractId).getStorageValues(keys);
    ctx.body = {
      contractTxId: contractId,
      sortKey: result?.sortKey,
      value: JSON.stringify(Array.from(result?.cachedValue.entries()))
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

// TODO: stop copy-pasting this :-)
function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}
