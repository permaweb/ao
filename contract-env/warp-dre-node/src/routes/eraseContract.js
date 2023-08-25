const warp = require('../warp');
const Arweave = require('arweave');
const fs = require('fs');
const ArweaveUtils = require('arweave/node/lib/utils');
const { deleteStates, deleteBlacklist, deleteErrors, deleteEvents } = require('../db/nodeDb');
const { config } = require('../config');

module.exports = async (ctx) => {
  const { nodeDb } = ctx;
  const contractId = ctx.params.id;
  const signature = ctx.query.signature;
  console.log(`Request to erase contract ${contractId}`);

  try {
    if (!isTxIdValid(contractId)) {
      throw new Error('Invalid tx format');
    }
    if (!signature) {
      throw new Error('Missing signature');
    }
    if (!(await isSigned(contractId, signature))) {
      throw new Error('Invalid tx signature');
    }
    const result = await warp.stateEvaluator.getCache().delete(contractId);
    console.log(`Delete ${contractId} result ${result}`);
    await deleteStates(nodeDb, contractId);
    await deleteBlacklist(nodeDb, contractId);
    await deleteErrors(nodeDb, contractId);
    await deleteEvents(contractId);
    pruneKvStorage(contractId);
    ctx.body = {
      contractTxId: contractId,
      result: result
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

function pruneKvStorage(txId) {
  const kvDir = `./cache/warp/kv/lmdb/${txId}`;
  if (fs.existsSync(kvDir)) {
    fs.rmSync(kvDir, { recursive: true });
    console.log(`Contract prune - removed ./cache/warp/kv/lmdb/${txId}`);
  }
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}
async function isSigned(txId, signature) {
  return await Arweave.crypto.verify(
    config.nodeJwk.n,
    ArweaveUtils.stringToBuffer(txId),
    ArweaveUtils.b64UrlToBuffer(signature)
  );
}
