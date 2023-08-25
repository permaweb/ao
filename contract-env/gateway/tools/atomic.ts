/* eslint-disable */
import fs from 'fs';
import Bundlr from '@bundlr-network/client';
import { LoggerFactory, WarpFactory, defaultCacheOptions } from 'warp-contracts';
import { ArweaveSigner } from 'arbundles/src/signing';
import { createData } from 'arbundles';
import Arweave from 'arweave';

async function main() {
  LoggerFactory.INST.logLevel('debug');
  const logger = LoggerFactory.INST.create('register');

  try {
    const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true });
    const jwk = JSON.parse(fs.readFileSync('.secrets/warp-wallet-jwk.json').toString());
    const bundlr = new Bundlr('https://node2.bundlr.network', 'arweave', jwk);
    const address = await warp.arweave.wallets.jwkToAddress(jwk);

    const data = fs.readFileSync('tools/data/data.txt');
    const contractTags = [
      { name: 'Content-Type', value: 'text/plain' },
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

    const transaction = bundlr.createTransaction(data, { tags: contractTags });
    await transaction.sign();
    const tx = await transaction.upload();

    await fetch(`https://gateway.warp.cc/gateway/contracts/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ id: tx.id, bundlrNode: 'node2' }),
    });
  } catch (e) {
    logger.error(e);
  }
}

main().catch((e) => console.error(e));
