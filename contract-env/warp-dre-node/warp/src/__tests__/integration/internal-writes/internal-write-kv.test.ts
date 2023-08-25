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
  let walletAddress: string;

  let arlocal: ArLocal;
  let warp: Warp;
  let calleeContract: Contract<ExampleContractState>;
  let callingContract: Contract<ExampleContractState>;
  let calleeTxId;
  let callingTxId;

  const port = 1911;

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
    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    callingContractSrc = fs.readFileSync(path.join(__dirname, '../data/kv-storage-inner-calls.js'), 'utf8');
    callingContractInitialState = fs.readFileSync(path.join(__dirname, '../data/token-pst.json'), 'utf8');
    calleeContractSrc = fs.readFileSync(path.join(__dirname, '../data/kv-storage-inner-calls.js'), 'utf8');
    calleeInitialState = fs.readFileSync(path.join(__dirname, '../data/token-pst.json'), 'utf8');

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
        mineArLocalBlocks: false,
        useKVStorage: true
      })
      .connect(wallet);

    callingContract = warp
      .contract<ExampleContractState>(callingTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false,
        useKVStorage: true
      })
      .connect(wallet);

    await mineBlock(warp);
  }

  describe('with read states in between', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should write direct interactions', async () => {
      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.readState();

      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(100);
    });

    it('should write one direct and one internal interaction', async () => {
      // await calleeContract.writeInteraction({function: 'add'});
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);
      await calleeContract.readState();

      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(200);
    });

    it('should write another direct interaction', async () => {
      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.readState();

      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(300);
    });

    it('should write double internal interaction with direct interaction', async () => {
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(500);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);
      await calleeContract.readState();

      const kvValues2 = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues2.cachedValue.get(walletAddress)).toEqual(600);
    });

    it('should write combination of internal and direct interaction', async () => {
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(800);
    });

    it('should write combination of internal and direct interaction', async () => {
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(1000);
    });

    it('should write combination of direct and internal interaction - at one block', async () => {
      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(1200);
    });

    it('should write combination of direct and internal interaction - on different blocks', async () => {
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(1400);
    });

    it('should properly evaluate state again', async () => {
      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(1400);
    });
  });

  describe('with read state at the end', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should properly write a combination of direct and internal interactions', async () => {
      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'innerWriteKV',
        txId: calleeTxId,
        target: walletAddress,
        qty: 100
      });
      await mineBlock(warp);

      await calleeContract.writeInteraction({ function: 'mintAdd', target: walletAddress, qty: 100 });
      await mineBlock(warp);

      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(1400);
    });

    it('should properly evaluate state again', async () => {
      await calleeContract.readState();
      const kvValues = await calleeContract.getStorageValues([walletAddress]);
      expect(kvValues.cachedValue.get(walletAddress)).toEqual(1400);
    });
  });
});
