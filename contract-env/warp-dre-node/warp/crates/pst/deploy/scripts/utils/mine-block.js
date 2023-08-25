module.exports.mineBlock = async function (arweave) {
  await arweave.api.get('mine');
};
