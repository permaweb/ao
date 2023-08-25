/* eslint-disable */
import Arweave from 'arweave';
import {
  ArweaveGatewayInteractionsLoader,
  BlockHeightInteractionsSorter,
  Contract, DefaultEvaluationOptions, LexicographicalInteractionsSorter,
  LoggerFactory,
  Warp,
  WarpNodeFactory
} from '../src';
import {TsLogFactory} from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import ArLocal from 'arlocal';
import {JWKInterface} from 'arweave/node/lib/wallet';

async function main() {
  let wallet: JWKInterface;
  let warp: Warp;

  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('error');
  LoggerFactory.INST.logLevel('debug', 'WasmContractHandlerApi');
  LoggerFactory.INST.logLevel('debug', 'WASM');
  LoggerFactory.INST.logLevel('info', 'sorting');
  const logger = LoggerFactory.INST.create('sorting');

  const arlocal = new ArLocal(1986, false);
  await arlocal.start();
  const arweave = Arweave.init({
    host: 'localhost',
    port: 1986,
    protocol: 'http'
  });

  try {
    warp = WarpNodeFactory.memCached(arweave);

    wallet = await arweave.wallets.generate();
    const walletAddress = await arweave.wallets.getAddress(wallet);
    await arweave.api.get(`/mint/${walletAddress}/1000000000000000`);

    const contractSrc = fs.readFileSync(path.join(__dirname, 'data/wasm/counter.wasm'));
    const initialState = fs.readFileSync(path.join(__dirname, 'data/wasm/counter-init-state.json'), 'utf8');


    const contractTxId = await warp.createContract.deploy({
      wallet,
      initState: initialState,
      src: contractSrc
    });

    const contract = warp.contract(contractTxId).connect(wallet).setEvaluationOptions({
      ignoreExceptions: true,
      gasLimit: 12000000
    });
    await mine();

    await contract.writeInteraction({function: 'infLoop'});
    await mine();

    const result = await contract.readState();

    logger.info(result);
  } catch (e) {
    logger.error(e)

  } finally {
    await arlocal.stop();
  }

  async function mine() {
    await arweave.api.get('mine');
  }
}

main().catch((e) => console.error(e));
