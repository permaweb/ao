/* eslint-disable */
import fs from 'fs';

import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import { VM2Plugin } from 'warp-contracts-plugin-vm2';

interface ExampleContractState {
  counter: number;
  errorCounter: number;
}

/**
 * The most basic example of writes between contracts.
 * In this suite "User" is calling CallingContract.writeContract
 * (which calls CalleContract.addAmount and in effect - changes its state)
 * or "User" is calling CalleeContract.add() directly.
 *
 * Multiple combinations of both calls (with mining happening on different stages)
 * are being tested.
 *
 *         ┌──────┐
 * ┌───┬───┤ User │
 * │   │   └──────┘
 * │   │   ┌─────────────────────────────────┐
 * │   │   │CallingContract                  │
 * │   │   ├─────────────────────────────────┤
 * │   └──►│writeContract(contractId, amount)├───┐
 * │       └─────────────────────────────────┘   │
 * │   ┌─────────────────────────────────────────┘
 * │   │   ┌─────────────────────────────────┐
 * │   │   │CalleeContract                   │
 * │   │   ├─────────────────────────────────┤
 * │   └──►│addAmount(amount)                │
 * └──────►│add()                            │
 *         └─────────────────────────────────┘
 */

describe('Testing internal writes', () => {
  let callingContractSrc: string;
  let callingContractInitialState: string;
  let calleeContractSrc: string;
  let calleeInitialState: string;

  let wallet: JWKInterface;

  let arlocal: ArLocal;
  let warp: Warp;
  let warpVm: Warp;
  let calleeContract: Contract<ExampleContractState>;
  let calleeContractVM: Contract<ExampleContractState>;
  let callingContract: Contract<ExampleContractState>;
  let callingContractVM: Contract<ExampleContractState>;
  let calleeTxId;
  let callingTxId;

  const port = 1910;

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
    warpVm = WarpFactory.forLocal(port).use(new DeployPlugin()).use(new VM2Plugin());
    ({ jwk: wallet } = await warp.generateWallet());

    callingContractSrc = fs.readFileSync(path.join(__dirname, '../data/writing-contract.js'), 'utf8');
    callingContractInitialState = fs.readFileSync(path.join(__dirname, '../data/writing-contract-state.json'), 'utf8');
    calleeContractSrc = fs.readFileSync(path.join(__dirname, '../data/example-contract.js'), 'utf8');
    calleeInitialState = fs.readFileSync(path.join(__dirname, '../data/example-contract-state.json'), 'utf8');

    ({ contractTxId: calleeTxId } = await warp.deploy({
      wallet,
      initState: calleeInitialState,
      src: calleeContractSrc
    }));

    ({ contractTxId: callingTxId } = await warp.deploy({
      wallet,
      initState: callingContractInitialState,
      src: callingContractSrc
    }));

    calleeContract = warp
      .contract<ExampleContractState>(calleeTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);
    calleeContractVM = warpVm
      .contract<ExampleContractState>(calleeTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);

    callingContract = warp
      .contract<ExampleContractState>(callingTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);
    callingContractVM = warpVm
      .contract<ExampleContractState>(callingTxId)
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

    it('should deploy callee contract with initial state', async () => {
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(555);
    });

    it('should write direct interactions', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(557);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(557);
    });

    it('should write one direct and one internal interaction', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(568);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(568);
    });

    it('should write another direct interaction', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(569);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(569);
    });

    it('should write double internal interaction with direct interaction', async () => {
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(590);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(590);
    });

    it('should write combination of internal and direct interaction', async () => {
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(601);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(601);
    });

    it('should write combination of internal and direct interaction', async () => {
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(612);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(612);
    });

    it('should write combination of direct and internal interaction - at one block', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(623);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(623);
    });

    it('should write combination of direct and internal interaction - on different blocks', async () => {
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(634);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(634);
    });

    it('should properly evaluate state again', async () => {
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(634);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(634);
    });
  });

  describe('with read state at the end', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should properly write a combination of direct and internal interactions', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'add' });
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'add' });
      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);

      await callingContract.writeInteraction({ function: 'writeContract', contractId: calleeTxId, amount: 10 });
      await mineBlock(warp);
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);

      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(634);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(634);
    });

    it('should properly evaluate state again', async () => {
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(634);
      expect((await calleeContractVM.readState()).cachedValue.state.counter).toEqual(634);
    });

    it('should properly evaluate state again with a new client', async () => {
      const calleeContract2 = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .contract<ExampleContractState>(calleeTxId)
        .setEvaluationOptions({
          internalWrites: true
        });
      const calleeContract2VM = WarpFactory.forLocal(port)
        .use(new DeployPlugin())
        .use(new VM2Plugin())
        .contract<ExampleContractState>(calleeTxId)
        .setEvaluationOptions({
          internalWrites: true
        });
      expect((await calleeContract2.readState()).cachedValue.state.counter).toEqual(634);
      expect((await calleeContract2VM.readState()).cachedValue.state.counter).toEqual(634);
    });
  });

  describe('with internal writes throwing exceptions', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should auto throw on default settings', async () => {
      const { originalTxId } = await callingContract.writeInteraction({
        function: 'writeContractAutoThrow',
        contractId: calleeTxId
      });
      await mineBlock(warp);

      const result = await callingContract.readState();

      // note: no calling contract code should be evaluated after internal write fails and auto throwing is on
      expect(result.cachedValue.errorMessages[originalTxId]).toContain('Internal write auto error for call');
      expect(result.cachedValue.state.errorCounter).toBeUndefined();
    });

    it('should auto throw on default settings during writeInteraction if strict', async () => {
      await expect(
        callingContract.writeInteraction(
          {
            function: 'writeContractAutoThrow',
            contractId: calleeTxId
          },
          { strict: true }
        )
      ).rejects.toThrowError(/Internal write auto error for call/);
    });

    it('should not auto throw on default settings during writeInteraction if strict and IW call force to NOT throw an exception', async () => {
      const { originalTxId } = await callingContract.writeInteraction(
        {
          function: 'writeContractForceNoAutoThrow',
          contractId: calleeTxId
        },
        { strict: true }
      );
      expect(originalTxId.length).toEqual(43);
    });

    it('should not auto throw on default settings if IW call force to NOT throw an exception', async () => {
      const { originalTxId } = await callingContract.writeInteraction({
        function: 'writeContractForceNoAutoThrow',
        contractId: calleeTxId
      });
      await mineBlock(warp);

      const result = await callingContract.readState();

      // note: in this case the calling contract "didn't notice" that the IW call failed
      expect(result.cachedValue.errorMessages[originalTxId]).toBeUndefined();
      expect(result.cachedValue.state.errorCounter).toEqual(2);
    });

    it('should not auto throw if evaluationOptions.throwOnInternalWriteError set to false', async () => {
      callingContract.setEvaluationOptions({
        throwOnInternalWriteError: false
      });

      const { originalTxId } = await callingContract.writeInteraction({
        function: 'writeContractAutoThrow',
        contractId: calleeTxId
      });
      await mineBlock(warp);

      const result = await callingContract.readState();

      // note: in this case the calling contract "didn't notice" that the IW call failed
      expect(result.cachedValue.errorMessages[originalTxId]).toBeUndefined();
      expect(result.cachedValue.state.errorCounter).toEqual(3);
    });

    it('should auto throw if evaluationOptions.throwOnInternalWriteError set to true', async () => {
      callingContract.setEvaluationOptions({
        throwOnInternalWriteError: true
      });

      const { originalTxId } = await callingContract.writeInteraction({
        function: 'writeContractAutoThrow',
        contractId: calleeTxId
      });
      await mineBlock(warp);

      const result = await callingContract.readState();

      // note: no calling contract code should be evaluated after internal write fails and auto throwing is on
      expect(result.cachedValue.errorMessages[originalTxId]).toContain('Internal write auto error for call');

      // this shouldn't change from the prev. test
      expect(result.cachedValue.state.errorCounter).toEqual(3);
    });

    it('should auto throw if evaluationOptions.throwOnInternalWriteError set to false and IW call force to throw an exception', async () => {
      callingContract.setEvaluationOptions({
        throwOnInternalWriteError: false
      });

      const { originalTxId } = await callingContract.writeInteraction({
        function: 'writeContractForceAutoThrow',
        contractId: calleeTxId
      });
      await mineBlock(warp);

      const result = await callingContract.readState();

      // note: no calling contract code should be evaluated after internal write fails and auto throwing is on
      expect(result.cachedValue.errorMessages[originalTxId]).toContain('Internal write auto error for call');

      // this shouldn't change from the prev. test
      expect(result.cachedValue.state.errorCounter).toEqual(3);
    });

    it('should not auto throw if evaluationOptions.throwOnInternalWriteError set to true and IW call force to NOT throw an exception', async () => {
      callingContract.setEvaluationOptions({
        throwOnInternalWriteError: true
      });

      const { originalTxId } = await callingContract.writeInteraction({
        function: 'writeContractForceNoAutoThrow',
        contractId: calleeTxId
      });
      await mineBlock(warp);

      const result = await callingContract.readState();

      expect(result.cachedValue.errorMessages[originalTxId]).toBeUndefined();
      expect(result.cachedValue.state.errorCounter).toEqual(4);
    });
  });
});
