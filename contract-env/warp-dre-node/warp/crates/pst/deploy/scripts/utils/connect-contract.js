const { getWarpInstance } = require("../deploy");

module.exports.connectContract = async function (
  arweave,
  wallet,
  contractTxId,
  target
) {
  console.log('Target:', target);

  const warp = getWarpInstance(arweave.api.config.port, target);
  return warp
    .contract(contractTxId)
    .connect(wallet);
};
