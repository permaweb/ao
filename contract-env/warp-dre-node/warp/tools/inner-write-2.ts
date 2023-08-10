/* eslint-disable */
import Arweave from 'arweave';
import { Contract, LoggerFactory, Warp, WarpNodeFactory } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';

async function main() {
  let contractASrc: string;
  let contractAInitialState: string;
  let contractBSrc: string;
  let contractBInitialState: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let warp: Warp;
  let contractA: Contract<any>;
  let contractB: Contract<any>;
  let contractC: Contract<any>;
  let contractATxId;
  let contractBTxId;
  let contractCTxId;

  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('debug');
  /*
   LoggerFactory.INST.logLevel('debug', 'HandlerBasedContract');
   LoggerFactory.INST.logLevel('debug', 'DefaultStateEvaluator');
   LoggerFactory.INST.logLevel('debug', 'CacheableStateEvaluator');
   LoggerFactory.INST.logLevel('debug', 'ContractHandler');
   LoggerFactory.INST.logLevel('debug', 'MemBlockHeightWarpCache');
 */ const logger = LoggerFactory.INST.create('inner-write');

  const arlocal = new ArLocal(1982, false);
  await arlocal.start();
  const arweave = Arweave.init({
    host: 'localhost',
    port: 1982,
    protocol: 'http'
  });

  try {
    warp = WarpNodeFactory.memCached(arweave);

    wallet = await arweave.wallets.generate();

    contractASrc = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/writing-contract.js'),
      'utf8'
    );
    contractAInitialState = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/writing-contract-state.json'),
      'utf8'
    );
    contractBSrc = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/example-contract.js'),
      'utf8'
    );
    contractBInitialState = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/example-contract-state.json'),
      'utf8'
    );

    contractATxId = await warp.createContract.deploy({
      wallet,
      initState: contractAInitialState,
      src: contractASrc
    });

    contractBTxId = await warp.createContract.deploy({
      wallet,
      initState: contractBInitialState,
      src: contractBSrc
    });

    contractA = warp.contract(contractATxId).setEvaluationOptions({ internalWrites: true }).connect(wallet);
    contractB = warp.contract(contractBTxId).setEvaluationOptions({ internalWrites: true }).connect(wallet);

    await mine();

    await contractA.readState();
    await contractB.readState();

    await contractA.writeInteraction({
      function: 'writeBack',
      contractId: contractBTxId,
      amount: 100
    });
    await mine();
    await contractA.readState();
    await contractB.readState();

    await contractA.writeInteraction({
      function: 'addAmount',
      contractId: contractBTxId,
      amount: 50
    });
    await mine();
    await contractB.writeInteraction({
      function: 'addAmount',
      contractId: contractBTxId,
      amount: 20
    });
    await mine();

    await contractA.writeInteraction({
      function: 'addAmount',
      contractId: contractBTxId,
      amount: 150
    });
    await contractB.writeInteraction({
      function: 'addAmount',
      contractId: contractBTxId,
      amount: 30
    });
    await mine();
    await contractA.readState();
    await contractB.readState();

    await contractA.writeInteraction({
      function: 'writeBackCheck',
      contractId: contractBTxId,
      amount: 200
    });
    await mine();
    await contractA.readState();
    await contractB.readState();

    logger.info('ContractA -805 :', (await contractA.readState()).state.counter);
    logger.info('ContractB -2060 :', (await contractB.readState()).state.counter);

    const contractA2 = WarpNodeFactory.memCached(arweave)
      .contract<any>(contractATxId)
      .setEvaluationOptions({ internalWrites: true })
      .connect(wallet);
    const contractB2 = WarpNodeFactory.memCached(arweave)
      .contract<any>(contractBTxId)
      .setEvaluationOptions({ internalWrites: true })
      .connect(wallet);

    logger.info('----- FRESH READ STATE A ----')
    logger.info('ContractA2 -805 :', (await contractA2.readState()).state.counter);

    logger.info('----- ANOTHER READ STATE A ----')
    logger.info('ContractA2 -805 :', (await contractA2.readState()).state.counter);
/*

    logger.info('----- FRESH READ STATE B ----')
    logger.info('ContractB2 -2060 :', (await contractB2.readState()).state.counter);

    logger.info('----- ANOTHER READ STATE B ----')
    logger.info('ContractB2 -2060 :', (await contractB2.readState()).state.counter);
*/


  } finally {
    await arlocal.stop();
  }

  async function mine() {
    await arweave.api.get('mine');
  }
}

main().catch((e) => console.error(e));
