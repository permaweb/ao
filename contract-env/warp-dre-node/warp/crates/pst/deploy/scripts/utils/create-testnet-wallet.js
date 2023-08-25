const fs = require('fs');
const path = require('path');

module.exports.generateWallet = async function (arweave, target) {
  const wallet = await arweave.wallets.generate();
  fs.writeFileSync(
    path.join(__dirname, `../../${target}/wallet_${target}.json`),
    JSON.stringify(wallet)
  );
};
