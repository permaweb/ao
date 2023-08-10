const fs = require('fs');
const path = require('path');
module.exports.contractTxId = function (target) {
  let txId;
  try {
    txId = fs
      .readFileSync(
        path.join(__dirname, `../../../deploy/${target}/contract-tx-id.txt`),
        'utf-8'
      )
      .trim();
  } catch (e) {
    throw new Error(
      'Contract tx id file not found! Please run deploy script first.'
    );
  }

  return txId;
};
