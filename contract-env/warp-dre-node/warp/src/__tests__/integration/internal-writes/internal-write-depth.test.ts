/* eslint-disable */
import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

/**
 * This test verifies "deep" writes between
 * contracts.
 *
 * 1. "User" calls ContractA.writeInDepth()
 * 2. Contract.writeInDepth() calls ContractB.addAmountDepth()
 * 3. ContractB.addAmountDepth(amount) increases its internal counter
 * by "amount" and calls ContractC.addAmount(amount + 20)
 * 4. ContractC.addAmount(amount) increases its internal counter
 * by amount.
 *
 * Multiple scenarios are tested separately (eg. with state read only on the
 * "deepest" contract).
 *
 *      ┌──────┐
 * ┌────┤ User │
 * │    └──────┘
 * │    ┌────────────────┐
 * │    │ContractA       │
 * │    ├────────────────┤
 * └───►│writeInDepth(   ├──────┐
 *      │ contractId1,   │      │
 *      │ contractId2,   │      │
 *      │ amount)        │      │
 *      └────────────────┘      │
 *    ┌─────────────────────────┘
 *    │      ┌────────────────┐
 *    │      │ContractB       │
 *    │      ├────────────────┤
 *    └─────►│addAmountDepth( ├─────┐
 *           │ contractId,    │     │
 *           │ amount)        │     │
 *           └────────────────┘     │
 *            ┌─────────────────────┘
 *            │    ┌─────────────┐
 *            │    │ContractC    │
 *            │    ├─────────────┤
 *            └───►│addAmount(   │
 *                 │ amount)     │
 *                 └─────────────┘
 */
describe('Testing internal writes', () => {
  let contractASrc: string;
  let contractAInitialState: string;
  let contractBSrc: string;
  let contractBInitialState: string;

  let wallet: JWKInterface;

  let arlocal: ArLocal;
  let warp: Warp;
  let contractA: Contract<any>;
  let contractB: Contract<any>;
  let contractC: Contract<any>;
  let contractATxId;
  let contractBTxId;
  let contractCTxId;

  const port = 1930;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(port, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  async function deployContracts() {
    warp = WarpFactory.forLocal(port).use(new DeployPlugin());

    ({ jwk: wallet } = await warp.generateWallet());

    contractASrc = fs.readFileSync(path.join(__dirname, '../data/writing-contract.js'), 'utf8');
    contractAInitialState = fs.readFileSync(path.join(__dirname, '../data/writing-contract-state.json'), 'utf8');
    contractBSrc = fs.readFileSync(path.join(__dirname, '../data/example-contract.js'), 'utf8');
    contractBInitialState = fs.readFileSync(path.join(__dirname, '../data/example-contract-state.json'), 'utf8');

    ({ contractTxId: contractATxId } = await warp.deploy({
      wallet,
      initState: contractAInitialState,
      src: contractASrc
    }));

    ({ contractTxId: contractBTxId } = await warp.deploy({
      wallet,
      initState: contractBInitialState,
      src: contractBSrc
    }));

    ({ contractTxId: contractCTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({ counter: 200 }),
      src: contractBSrc
    }));

    contractA = warp
      .contract(contractATxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);
    contractB = warp
      .contract(contractBTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);
    contractC = warp
      .contract(contractCTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);

    await mineBlock(warp);
  }

  describe('with read states in between', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should deploy contracts with initial state', async () => {
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(100);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(555);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(200);
    });

    it('should properly create multiple internal calls (1)', async () => {
      await contractB.writeInteraction({ function: 'add' });
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(557);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(201);
    });

    it('should properly create multiple internal calls (2)', async () => {
      await contractA.writeInteraction({
        function: 'writeInDepth',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });

    it('should properly evaluate again the state', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });
  });

  describe('with read state at the end', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should properly create multiple internal calls', async () => {
      await contractB.writeInteraction({ function: 'add' });
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeInDepth',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });

    it('should properly evaluate again the state', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });

    it('should properly evaluate state with a new client', async () => {
      const contractB2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractBTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);

      const contractC2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractCTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      expect((await contractB2.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC2.readState()).cachedValue.state.counter).toEqual(231);
    });
  });

  describe('with read only on the middle contract', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should properly create multiple internal calls', async () => {
      await contractB.writeInteraction({ function: 'add' });
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeInDepth',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
    });

    it('should properly evaluate the state again', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
    });

    it('should properly evaluate the state again', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });
  });

  describe('with read only on the deepest contract', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should properly create multiple internal calls', async () => {
      await contractB.writeInteraction({ function: 'add' });
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeInDepth',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });

    it('should properly evaluate the state again', async () => {
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });

    it('should properly evaluate the state again', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(567);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });
  });

  describe('with different maxDepths', () => {
    beforeEach(async () => {
      await deployContracts();
    });

    it('should properly evaluate contractC state for maxDepth = 3', async () => {
      contractC.setEvaluationOptions({
        maxCallDepth: 3
      });

      await contractB.writeInteraction({ function: 'add' });
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeInDepth',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(231);
    });

    it('should throw when evaluating ContractC state for maxDepth = 2', async () => {
      contractC.setEvaluationOptions({
        maxCallDepth: 2,
        ignoreExceptions: false
      });

      await contractB.writeInteraction({ function: 'add' });
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeInDepth',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      await expect(contractC.readState()).rejects.toThrow(/(.)*Error: Max call depth(.*)/);
    });
  });
});
