const { getWarpInstance } = require("../deploy");

module.exports.connectPstContract = async function (
  arweave,
  wallet,
  contractTxId,
  target
) {

  const warp = getWarpInstance(arweave.api.config.port, target);
  return warp
    .pst(contractTxId)
    .connect(wallet);
};
