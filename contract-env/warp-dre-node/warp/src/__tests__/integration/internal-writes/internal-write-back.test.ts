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
 * This test verifies "write-backs" between contracts:
 * 1. User calls ContractA.writeBack()
 * 2. ContractA calls ContractB.addAndWrite()
 * 3. ContractB.addAndWrite calls ContractA.addAmount()
 *
 *          ┌──────┐
 *     ┌────┤ User │
 *     │    └──────┘
 *     │    ┌────────────────┐
 *     │    │ContractA       │
 *     │    ├────────────────┤
 *     └───►│writeBack(      ├────┐
 *          │ contractId,    │    │
 *          │ amount)        │    │
 *          ├────────────────┤    │
 * ┌───────►│addAmount(      │    │
 * │        │ amount)        │    │
 * │        └────────────────┘    │
 * │    ┌─────────────────────────┘
 * │    │   ┌────────────────┐
 * │    │   │ContractB       │
 * │    │   ├────────────────┤
 * │    └──►│addAndWrite(    ├────┐
 * │        │ contractId,    │    │
 * │        │ amount)        │    │
 * │        └────────────────┘    │
 * └──────────────────────────────┘
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
  let contractATxId;
  let contractBTxId;

  const port = 1900;

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
    ({ arweave } = warp);

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

    await mineBlock(warp);
  }

  describe('with read states in between', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should deploy contracts with initial state', async () => {
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(100);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(555);
    });

    /**
     * This test verifies whether writes between contracts within one transaction work
     * properly.
     * 1. User calls contractA.writeBack(contractBTxId)
     * 2. contractA.writeBack() calls contractB.addAndWrite(amount, contractATxId)
     * 3. contractB.addAndWrite() calls contractA.addAmount() and adds contractA.state.counter
     * to its own state.counter
     * 4. After calling contractB.addAndWrite, contractA.writeBack adds contractB.state.counter
     * to its own state.counter
     */
    it('should write back', async () => {
      await contractA.writeInteraction({
        function: 'writeBack',
        contractId: contractBTxId,
        amount: 100
      });
      await mineBlock(warp);
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(855);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(755);
    });

    /**
     * This tests simply adds some more "direct" interactions
     * to ContractA and ContractB
     */
    it('should write direct interactions', async () => {
      await contractA.writeInteraction({
        function: 'addAmount',
        contractId: contractBTxId,
        amount: 50
      });
      await mineBlock(warp);
      await contractB.writeInteraction({
        function: 'addAmount',
        contractId: contractBTxId,
        amount: 20
      });
      await mineBlock(warp);

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
      await mineBlock(warp);

      expect((await contractA.readState()).cachedValue.state.counter).toEqual(1055);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(805);
    });

    it('should properly evaluate state with a new client', async () => {
      const contractA2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractATxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      const contractB2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractBTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      expect((await contractA2.readState()).cachedValue.state.counter).toEqual(1055);
      expect((await contractB2.readState()).cachedValue.state.counter).toEqual(805);
    });

    /**
     * This tests verifies whether changing state of the ContractA by ContractB
     * allows to perform some logic based on the Contract's A updated state
     * 1. User calls contractA.writeBackCheck(contractBTxId)
     * 2. contractA.writeBackCheck() calls contractB.addAndWrite(amount, contractATxId)
     * 3. contractB.addAndWrite() calls contractA.addAmount() and adds contractA.state.counter
     * to its own state.counter
     * 4. contractA.writeBackCheck() refreshes its state (changed by contractB.addAndWrite()
     * in point 3), check its current state.counter value - and depending on the value
     * subtracts or adds contractB.state.counter to its own state.counter
     */
    it('should write back with state check', async () => {
      await contractA.writeInteraction({
        function: 'writeBackCheck',
        contractId: contractBTxId,
        amount: 200
      });
      await mineBlock(warp);
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(-805);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(2060);
    });

    it('should properly evaluate state again', async () => {
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(-805);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(2060);
    });

    it('should properly evaluate state with a new client', async () => {
      const contractA2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractATxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      const contractB2 = WarpFactory.forLocal(port)
        .contract<any>(contractBTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      expect((await contractA2.readState()).cachedValue.state.counter).toEqual(-805);
      expect((await contractB2.readState()).cachedValue.state.counter).toEqual(2060);
    });
  });

  describe('with read state at the end', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should write properly add multiple write back interactions', async () => {
      await contractA.writeInteraction({
        function: 'writeBack',
        contractId: contractBTxId,
        amount: 100
      });
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'addAmount',
        contractId: contractBTxId,
        amount: 50
      });
      await mineBlock(warp);
      await contractB.writeInteraction({
        function: 'addAmount',
        contractId: contractBTxId,
        amount: 20
      });
      await mineBlock(warp);

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
      await mineBlock(warp);

      await contractA.writeInteraction({
        function: 'writeBackCheck',
        contractId: contractBTxId,
        amount: 200
      });
      await mineBlock(warp);

      expect((await contractA.readState()).cachedValue.state.counter).toEqual(-805);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(2060);
    });

    it('should properly evaluate state with a new client', async () => {
      const contractA2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractATxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      const contractB2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractBTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);

      expect((await contractA2.readState()).cachedValue.state.counter).toEqual(-805);
      expect((await contractB2.readState()).cachedValue.state.counter).toEqual(2060);
    });

    it('should properly evaluate state again', async () => {
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(-805);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(2060);
    });
  });

  describe('with read state of A contract', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should deploy contracts with initial state', async () => {
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(100);
    });

    it('should write back', async () => {
      await contractA.writeInteraction({
        function: 'writeBack',
        contractId: contractBTxId,
        amount: 100
      });
      await mineBlock(warp);
      expect((await contractA.readState()).cachedValue.state.counter).toEqual(855);
    });
  });

  describe('with read state of B contract', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should deploy contracts with initial state', async () => {
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(555);
    });

    it('should write back', async () => {
      await contractA.writeInteraction({
        function: 'writeBack',
        contractId: contractBTxId,
        amount: 100
      });
      await mineBlock(warp);
      expect((await contractB.readState()).cachedValue.state.counter).toEqual(755);
    });

    it('should properly evaluate state with a new client', async () => {
      const contractA2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractATxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      const contractB2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<any>(contractBTxId)
        .setEvaluationOptions({ internalWrites: true })
        .connect(wallet);
      expect((await contractA2.readState()).cachedValue.state.counter).toEqual(855);
      expect((await contractB2.readState()).cachedValue.state.counter).toEqual(755);
    });
  });
});
