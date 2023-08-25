/* eslint-disable */
import Arweave from 'arweave';
import {
  Contract,
  LoggerFactory, Warp, WarpFactory
} from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';
import {mineBlock} from "../src/__tests__/integration/_helpers";

async function main() {
  let callingContractSrc: string;
  let calleeContractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let smartweave: Warp;
  let calleeContract: Contract<any>;
  let callingContract: Contract;
  let calleeTxId;

  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('fatal');
  LoggerFactory.INST.logLevel('debug', 'inner-write');
  /*
  LoggerFactory.INST.logLevel('trace', 'LevelDbCache');
  LoggerFactory.INST.logLevel('debug', 'CacheableStateEvaluator');
  LoggerFactory.INST.logLevel('debug', 'HandlerBasedContract');
  LoggerFactory.INST.logLevel('debug', 'DefaultStateEvaluator');
  LoggerFactory.INST.logLevel('debug', 'ContractHandlerApi');
  */
  const logger = LoggerFactory.INST.create('inner-write');

  const arlocal = new ArLocal(1985, false);
  await arlocal.start();
  const arweave = Arweave.init({
    host: 'localhost',
    port: 1985,
    protocol: 'http'
  });

  const cacheDir = './cache/tools/'
  try {
    smartweave = WarpFactory.forLocal(arweave);

    wallet = await arweave.wallets.generate();
    walletAddress = await arweave.wallets.jwkToAddress(wallet);
    await arweave.api.get(`/mint/${walletAddress}/1000000000000000`);

    callingContractSrc = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/writing-contract.js'),
      'utf8'
    );
    calleeContractSrc = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/example-contract.js'),
      'utf8'
    );

    // deploying contract using the new SDK.
    ({contractTxId: calleeTxId} = await smartweave.createContract.deploy({
      wallet,
      initState: JSON.stringify({ counter: 0 }),
      src: calleeContractSrc
    }));

    const {contractTxId: callingTxId} = await smartweave.createContract.deploy({
      wallet,
      initState: JSON.stringify({ ticker: 'WRITING_CONTRACT' }),
      src: callingContractSrc
    });

    calleeContract = smartweave.contract(calleeTxId).connect(wallet).setEvaluationOptions({
      ignoreExceptions: false,
      internalWrites: true,
    });
    callingContract = smartweave.contract(callingTxId).connect(wallet).setEvaluationOptions({
      ignoreExceptions: false,
      internalWrites: true
    });
    await mine();


    await calleeContract.writeInteraction({ function: 'add' });
    logger.debug("Cache dump 1", showCache(await calleeContract.dumpCache()));
    await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
    logger.debug("Cache dump 2", showCache(await calleeContract.dumpCache()));
    await mineBlock(arweave);

    await calleeContract.writeInteraction({ function: 'add' });
    logger.debug("Cache dump 3", showCache(await calleeContract.dumpCache()));
    await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
    logger.debug("Cache dump 4", showCache(await calleeContract.dumpCache()));
    await mineBlock(arweave);

    await calleeContract.writeInteraction({ function: 'add' });
    logger.debug("Cache dump 5", showCache(await calleeContract.dumpCache()));
    await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
    logger.debug("Cache dump 6", showCache(await calleeContract.dumpCache()));
    await mineBlock(arweave);

    await calleeContract.writeInteraction({ function: 'add' });
    logger.debug("Cache dump 7", showCache(await calleeContract.dumpCache()));
    await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
    logger.debug("Cache dump 8", showCache(await calleeContract.dumpCache()));
    await mineBlock(arweave);

    const result2 = await calleeContract.readState();
    logger.debug("Cache dump 9", showCache(await calleeContract.dumpCache()));
    logger.info('Result (should be 44):', result2.state.counter);

    /*const result = await callingContract.readState();
    logger.debug("4", showCache(await callingContract.dumpCache()));

    logger.info('Result (should be 21):', result.state);*/

  } finally {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    await arlocal.stop();
  }

  async function mine() {
    await arweave.api.get('mine');
  }

  function showCache(dump: any) {
    return dump/*.filter(i => i[0].includes(calleeTxId))*/
      .map(i => i[0].includes(calleeTxId) ? `${i[0]}: ${i[1].state.counter}` : `${i[0]}: ${i[1].state.ticker}`);
  }
}

main().catch((e) => console.error(e));
