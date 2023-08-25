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
 * This test verifies multiple internal calls from
 * one contract:
 * 1. User calls ContractA.writeMultiContract()
 * 2. ContractA.writeMultiContract() makes two internal calls
 * - ContractB.addAmount()
 * - ContractC.addAmount()
 * which causes state of ContractB and ContractC to change.
 *
 *      ┌──────┐
 * ┌────┤ User │
 * │    └──────┘
 * │    ┌───────────────────┐
 * │    │ContractA          │
 * │    ├───────────────────┤
 * └───►│writeMultiContract(├──┬──┐
 *      │ contractId1,      │  │  │
 *      │ contractId2,      │  │  │
 *      │ amount)           │  │  │
 *      └───────────────────┘  │  │
 *   ┌─────────────────────────┘  │
 *   │  ┌─────────────────────────┘
 *   │  │  ┌─────────────┐
 *   │  │  │ContractB    │
 *   │  │  ├─────────────┤
 *   │  └─►│addAmount(   │
 *   │     │ amount)     │
 *   │     └─────────────┘
 *   │     ┌─────────────┐
 *   │     │ContractC    │
 *   │     ├─────────────┤
 *   └────►│addAmount(   │
 *         │ amount)     │
 *         └─────────────┘
 */
describe('Testing internal writes', () => {
  let contractASrc: string;
  let contractAInitialState: string;
  let contractBSrc: string;
  let contractBInitialState: string;

  let wallet: JWKInterface;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let contractA: Contract<any>;
  let contractB: Contract<any>;
  let contractC: Contract<any>;
  let contractATxId;
  let contractBTxId;
  let contractCTxId;

  const port = 1940;

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
      .setEvaluationOptions({ internalWrites: true, mineArLocalBlocks: false })
      .connect(wallet);
    contractB = warp
      .contract(contractBTxId)
      .setEvaluationOptions({ internalWrites: true, mineArLocalBlocks: false })
      .connect(wallet);
    contractC = warp
      .contract(contractCTxId)
      .setEvaluationOptions({ internalWrites: true, mineArLocalBlocks: false })
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
      await contractB.writeInteraction({ function: 'add' });
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(568);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(212);
    });

    it('should properly create multiple internal calls (3)', async () => {
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(569);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(213);
    });

    it('should properly create multiple internal calls (4)', async () => {
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await contractC.writeInteraction({ function: 'add' });
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(590);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(235);
    });

    it('should properly create multiple internal calls (5)', async () => {
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(601);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(245);
    });

    it('should properly create multiple internal calls (6)', async () => {
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(612);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(256);
    });

    it('should properly create multiple internal calls (7)', async () => {
      await contractB.writeInteraction({ function: 'add' });
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(634);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(276);
    });

    it('should properly evaluate again the state', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(634);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(276);
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

      await contractB.writeInteraction({ function: 'add' });
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await contractC.writeInteraction({ function: 'add' });
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await contractC.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await contractB.writeInteraction({ function: 'add' });
      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeMultiContract',
        contractId1: contractBTxId,
        contractId2: contractCTxId,
        amount: 10
      });
      await mineBlock(warp);
      await contractB.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await contractB.readState()).cachedValue.state.counter).toEqual(634);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(276);
    });

    it('should properly evaluate the state again', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(634);
      expect((await contractC.readState()).cachedValue.state.counter).toEqual(276);
    });

    it('should properly evaluate state with a new client', async () => {
      const contractB2 = WarpFactory.forLocal(port)
        .contract<any>(contractBTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      const contractC2 = WarpFactory.forLocal(port)
        .contract<any>(contractCTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      expect((await contractB2.readState()).cachedValue.state.counter).toEqual(634);
      expect((await contractC2.readState()).cachedValue.state.counter).toEqual(276);
    });
  });
});
