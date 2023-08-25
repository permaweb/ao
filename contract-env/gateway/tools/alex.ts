/* eslint-disable */
import fs from 'fs';
import Bundlr from '@bundlr-network/client';
import { LoggerFactory, WarpFactory, defaultCacheOptions } from 'warp-contracts';
import { ArweaveSigner } from 'arbundles/src/signing';
import { createData } from 'arbundles';

async function main() {
  LoggerFactory.INST.logLevel('debug');
  const logger = LoggerFactory.INST.create('register');

  try {
    const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true });
    const jwk = JSON.parse(fs.readFileSync('.secrets/warp-wallet-jwk.json').toString());
    const bundlr = new Bundlr('https://node2.bundlr.network', 'arweave', jwk);
    const address = await warp.arweave.wallets.jwkToAddress(jwk);
    const userSigner = new ArweaveSigner(jwk);

    const asset = fs.readFileSync('tools/data/data.txt');
    const assetTags = [{ name: 'Content-Type', value: 'text/plain' }];

    const assetTx = bundlr.createTransaction(asset, { tags: assetTags });
    await assetTx.sign();
    const assetBundlrResponse = await assetTx.upload();

    const contractData = JSON.stringify({
      manifest: 'arweave/paths',
      version: '0.1.0',
      index: {
        path: 'asset',
      },
      paths: {
        asset: {
          id: assetBundlrResponse.id,
        },
      },
    });

    const contractTags = [
      { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
      { name: 'App-Name', value: 'SmartWeaveContract' },
      { name: 'App-Version', value: '0.3.0' },
      { name: 'Contract-Src', value: 'XA-sFBRvgIFFklmDV-TUlUPc3_pE3rIsXwH2AjwOYrQ' },
      {
        name: 'Init-State',
        value: JSON.stringify({
          ticker: 'ATOMIC_ASSET',
          owner: address,
          canEvolve: true,
          balances: {
            [address]: 10000000,
          },
          wallets: {},
        }),
      },
      { name: 'Title', value: 'Asset' },
      { name: 'Description', value: 'Description' },
      { name: 'Type', value: 'Text' },
    ];

    const dataItem = createData(contractData, userSigner, { tags: contractTags });
    await dataItem.sign(userSigner);

    console.log('data-item id:', dataItem.id);

    const response = await fetch(`https://gateway.redstone.finance/gateway/contracts/deploy-bundled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Accept: 'application/json',
      },
      body: dataItem.getRaw(),
    });
  } catch (e) {
    logger.error(e);
  }
}

main().catch((e) => console.error(e));