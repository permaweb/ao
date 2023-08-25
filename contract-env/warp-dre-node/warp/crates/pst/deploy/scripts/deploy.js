const fs = require('fs');
const path = require('path');
const { WarpFactory, defaultCacheOptions } = require('warp-contracts');
const { mineBlock } = require('./utils/mine-block');
const { loadWallet, walletAddress } = require('./utils/load-wallet');
const { connectArweave } = require('./utils/connect-arweave');

module.exports.deploy = async function (host, port, protocol, target, walletJwk) {
  const arweave = connectArweave(host, port, protocol);
  const warp = module.exports.getWarpInstance(port, target);
  const wallet = await loadWallet(arweave, walletJwk, target);
  const walletAddr = await walletAddress(arweave, wallet);
  const contractSrc = fs.readFileSync(path.join(__dirname, '../../contract/implementation/pkg/rust-contract_bg.wasm'));
  const stateFromFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../state/init-state.json'), 'utf-8'));

  const initialState = {
    ...stateFromFile,
    ...{
      owner: walletAddr,
      balances: {
        ...stateFromFile.balances,
        [walletAddr]: 10000000,
      },
    },
  };
  const {contractTxId} = await warp.createContract.deploy(
    {
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc,
      wasmSrcCodeDir: path.join(__dirname, '../../contract/implementation/src'),
      wasmGlueCode: path.join(__dirname, '../../contract/implementation/pkg/rust-contract.js'),
    }
  );
  fs.writeFileSync(path.join(__dirname, `../${target}/contract-tx-id.txt`), contractTxId);

  if (target == 'testnet' || target == 'local') {
    await mineBlock(arweave);
  }

  if (target == 'testnet') {
    console.log(`Check contract at https://sonar.warp.cc/#/app/contract/${contractTxId}?network=testnet`);
  } else {
    console.log('Contract tx id', contractTxId);
  }
};

module.exports.getWarpInstance = function (port, target) {
  if (target == 'local') {
    return WarpFactory.forLocal(port);
  } else if (target == 'testnet') {
    return WarpFactory.forTestnet();
  } else {
    return WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true });
  }
}
