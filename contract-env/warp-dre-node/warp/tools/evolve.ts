/* eslint-disable */
import { defaultCacheOptions, LoggerFactory, WarpFactory } from '../src';
import fs from 'fs';
import path from 'path';
import { JWKInterface } from 'arweave/node/lib/wallet';

async function main() {
  let wallet: JWKInterface = readJSON('./.secrets/jwk.json');
  LoggerFactory.INST.logLevel('info');
  const logger = LoggerFactory.INST.create('evolve');

  try {
    const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true });

    const jsContractSrc = fs.readFileSync(path.join(__dirname, 'data/js/token-pst.js'), 'utf8');
    const newJsContractSrc = fs.readFileSync(path.join(__dirname, 'data/js/token-evolve.js'), 'utf8');
    const owner = await warp.arweave.wallets.jwkToAddress(wallet);
    const initialState = {
      ticker: 'EXAMPLE_PST_TOKEN',
      owner,
      canEvolve: true,
      balances: {
        'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M': 10000000,
        '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA': 23111222
      },
      wallets: {}
    };

    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: jsContractSrc
    });

    const contract = warp.contract<any>(contractTxId).connect(wallet);

    const { result } = await contract.viewState<any>({
      function: 'balance',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
    });

    console.log('Original result', result);

    const srcTx = await warp.createSourceTx({ src: newJsContractSrc }, wallet);
    const newSrcTxId = await warp.saveSourceTx(srcTx);
    console.log('Save result', newSrcTxId);
    await contract.evolve(newSrcTxId);

    const { result: evolvedResult } = await contract.viewState<any>({
      function: 'balance',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
    });

    console.log('Evolved result', evolvedResult);
  } catch (e) {
    logger.error(e);
  }
}

export function readJSON(path: string): JWKInterface {
  const content = fs.readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

main().catch((e) => console.error(e));
