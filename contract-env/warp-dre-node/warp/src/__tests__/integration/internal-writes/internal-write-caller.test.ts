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
 * This verifies whether combination of read and write state works properly.
 * 1. User calls ContractA.writeContractCheck(amount)
 * 2. ContractA.writeContractCheck() checks ContractB.counter value
 * 3. If ContractB.counter > 600 - it calls ContractB.addAmount(-amount)
 * 4. If ContractB.counter <= 600 - it call ContractB.addAmount(amount)
 * 5. ContractA adds to its counter current value of ContractB.counter
 *
 *           ┌──────┐
 *      ┌────┤ User │
 *      │    └──────┘
 *      │    ┌───────────────────┐
 *      │    │ContractA          │
 *      │    ├───────────────────┤
 *      └───►│writeContractCheck(├─────┐
 *           │ contractId,       │     │
 *           │ amount)           │     │
 *           └───────────────────┘     │
 *                      ┌──────────────┘
 *                      ▼
 *        ┌───────────────────────────┐
 *        │                           │
 *        │  ContractB.counter > 600  │
 *        │                           │
 *        └────────────┬──────────────┘
 *              No     │     Yes
 *         ┌───────────┴─────────────┐
 *         ▼                         ▼
 * ┌─────────────┐             ┌─────────────┐
 * │ContractB    │             │ContractB    │
 * ├─────────────┤             ├─────────────┤
 * │addAmount(   │             │addAmount(   │
 * │ amount)     │             │ -amount)    │
 * └───────┬─────┘             └──────┬──────┘
 *         └────────────┬─────────────┘
 *                      ▼
 *  ┌────────────────────────────────────────┐
 *  │                                        │
 *  │ ContractA.counter += ContractB.counter │
 *  │                                        │
 *  └────────────────────────────────────────┘
 */
describe('Testing internal writes', () => {
  let callingContractSrc: string;
  let callingContractInitialState: string;
  let calleeContractSrc: string;
  let calleeInitialState: string;

  let wallet: JWKInterface;

  let arlocal: ArLocal;
  let warp: Warp;
  let calleeContract: Contract<any>;
  let callingContract: Contract<any>;
  let calleeTxId;
  let callingTxId;

  const port = 1920;

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
      .contract(calleeTxId)
      .setEvaluationOptions({
        internalWrites: true,
        mineArLocalBlocks: false
      })
      .connect(wallet);
    callingContract = warp
      .contract(callingTxId)
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
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(555);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(100);
    });

    it('should write direct interactions', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      await callingContract.writeInteraction({
        function: 'writeContractCheck',
        contractId: calleeTxId,
        amount: 400
      });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(555 + 1 + 400);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(100 + 555 + 1 + 400);

      await callingContract.writeInteraction({
        function: 'writeContractCheck',
        contractId: calleeTxId,
        amount: 100
      });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(956 - 100);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(1056 + 856);

      await callingContract.writeInteraction({
        function: 'writeContractCheck',
        contractId: calleeTxId,
        amount: 300
      });
      await mineBlock(warp);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(856 - 300);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(1912 + 556);
    });

    it('should properly evaluate state again', async () => {
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(856 - 300);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(1912 + 556);
    });
  });

  describe('with read state at the end', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should write direct interactions', async () => {
      await calleeContract.writeInteraction({ function: 'add' });
      await mineBlock(warp);
      await callingContract.writeInteraction({
        function: 'writeContractCheck',
        contractId: calleeTxId,
        amount: 400
      });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'writeContractCheck',
        contractId: calleeTxId,
        amount: 100
      });
      await mineBlock(warp);

      await callingContract.writeInteraction({
        function: 'writeContractCheck',
        contractId: calleeTxId,
        amount: 300
      });
      await mineBlock(warp);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(1912 + 556);
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(856 - 300);
    });

    it('should properly evaluate state again', async () => {
      expect((await calleeContract.readState()).cachedValue.state.counter).toEqual(856 - 300);
      expect((await callingContract.readState()).cachedValue.state.counter).toEqual(1912 + 556);
    });
  });
});
