/* eslint-disable */
import Arweave from 'arweave';
import { Contract, LoggerFactory, Warp, WarpNodeFactory } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';

async function main() {
  let tokenContractSrc: string;
  let tokenContractInitialState: string;
  let tokenContract: Contract<any>;
  let tokenContractTxId;

  let stakingContractSrc: string;
  let stakingContractInitialState: string;
  let stakingContract: Contract<any>;
  let stakingContractTxId;

  let wallet: JWKInterface;
  let walletAddress: string;

  let warp: Warp;

  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('debug');
  /*
   LoggerFactory.INST.logLevel('debug', 'HandlerBasedContract');
   LoggerFactory.INST.logLevel('debug', 'DefaultStateEvaluator');
   LoggerFactory.INST.logLevel('debug', 'CacheableStateEvaluator');
   LoggerFactory.INST.logLevel('debug', 'ContractHandler');
   LoggerFactory.INST.logLevel('debug', 'MemBlockHeightWarpCache');
 */ const logger = LoggerFactory.INST.create('stake');

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
    walletAddress = await arweave.wallets.jwkToAddress(wallet);


    tokenContractSrc = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/staking/token-allowance.js'),
      'utf8'
    );
    tokenContractInitialState = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/staking/token-allowance.json'),
      'utf8'
    );
    stakingContractSrc = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/staking/staking-contract.js'),
      'utf8'
    );
    stakingContractInitialState = fs.readFileSync(
      path.join(__dirname, '../src/__tests__/integration/', 'data/staking/staking-contract.json'),
      'utf8'
    );

    tokenContractTxId = await warp.createContract.deploy({
      wallet,
      initState: JSON.stringify({
        ...JSON.parse(tokenContractInitialState),
        owner: walletAddress
      }),
      src: tokenContractSrc
    });

    stakingContractTxId = await warp.createContract.deploy({
      wallet,
      initState: JSON.stringify({
        ...JSON.parse(stakingContractInitialState),
        tokenTxId: tokenContractTxId
      }),
      src: stakingContractSrc
    });

    tokenContract = warp
      .contract(tokenContractTxId)
      .setEvaluationOptions({ internalWrites: true })
      .connect(wallet);
    stakingContract = warp
      .contract(stakingContractTxId)
      .setEvaluationOptions({ internalWrites: true })
      .connect(wallet);
    await mine();

    await tokenContract.writeInteraction({
      function: 'mint',
      account: walletAddress,
      amount: 10000
    });
    await mine();

    await tokenContract.writeInteraction({
      function: 'approve',
      spender: stakingContractTxId,
      amount: 9999
    });
    await stakingContract.writeInteraction({
      function: 'stake',
      amount: 1000
    });
    await mine();

    //const tokenState = (await tokenContract.readState()).state;
    //logger.info('token stakes:', tokenState.state.stakes);
    //logger.info('token balances:', tokenState.state.balances);
    //logger.info('Staking state:', (await stakingContract.readState()).state.stakes);
  } finally {
    await arlocal.stop();
  }

  async function mine() {
    await arweave.api.get('mine');
  }
}

main().catch((e) => console.error(e));
