import fs from 'fs';

import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import { mineBlock } from '../_helpers';
import { WriteInteractionResponse } from '../../../contract/Contract';

describe('Constructor', () => {
  let contractSrc: string;
  let contractIrSrc: string;
  let helperContractSrc: string;
  let dummyContractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  const initialState: Record<string, number> = {
    counter: 1
  };

  let arlocal: ArLocal;
  let warp: Warp;

  beforeAll(async () => {
    arlocal = new ArLocal(1332, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(1332).use(new DeployPlugin());

    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../data/constructor/constructor.js'), 'utf8');
    contractIrSrc = fs.readFileSync(path.join(__dirname, '../data/constructor/constructor-internal-writes.js'), 'utf8');
    helperContractSrc = fs.readFileSync(path.join(__dirname, '../data/constructor/constructor-helper.js'), 'utf8');
    dummyContractSrc = fs.readFileSync(path.join(__dirname, '../data/constructor/constructor-dummy.js'), 'utf8');
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  const deployContract = async ({ withConstructor = true, withKv = true, addToState = {}, src = contractSrc }) => {
    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({ ...initialState, ...addToState }),
      src: src,
      evaluationManifest: withConstructor
        ? {
            evaluationOptions: {
              useConstructor: true,
              useKVStorage: withKv,
              internalWrites: !withKv,
              ignoreExceptions: false
            }
          }
        : undefined
    });

    const contract = warp
      .contract<any>(contractTxId)
      .setEvaluationOptions(
        withConstructor
          ? { useConstructor: true, internalWrites: !withKv, ignoreExceptions: false }
          : { ignoreExceptions: false }
      )
      .connect(wallet);

    await mineBlock(warp);

    return contract;
  };

  describe('with useConstructor = true', () => {
    describe('0 interactions', () => {
      it('should call constructor on first read state and works with next readStates', async () => {
        const contract = await deployContract({});

        const {
          cachedValue: { state }
        } = await contract.readState();

        expect(state.calls).toBeDefined();
        expect(state.calls).toEqual(['__init']);

        const {
          cachedValue: { state: state2 }
        } = await contract.readState();

        expect(state2.calls).toBeDefined();
        expect(state2.calls).toEqual(['__init']);
      });
    });

    describe('with missing interactions', () => {
      it('should call constructor on first read state and works with next readStates', async () => {
        const contract = await deployContract({});

        await contract.writeInteraction({ function: 'nop' });

        const {
          cachedValue: { state }
        } = await contract.readState();

        expect(state.calls).toBeDefined();
        expect(state.calls).toEqual(['__init', 'nop']);

        await contract.writeInteraction({ function: 'nop' });
        await contract.writeInteraction({ function: 'nop' });

        const {
          cachedValue: { state: state2 }
        } = await contract.readState();

        expect(state2.calls).toBeDefined();
        expect(state2.calls).toEqual(['__init', 'nop', 'nop', 'nop']);
      });
    });

    describe('Constructor has access to part of smartweave globals', () => {
      it('should assign as caller deployer of contract', async () => {
        const contract = await deployContract({});

        const {
          cachedValue: { state }
        } = await contract.readState();

        expect(state.caller).toEqual(walletAddress);
        expect(state.caller2).toEqual(walletAddress);

        await contract.writeInteraction({ function: 'nop' });
        const {
          cachedValue: { state: state2 }
        } = await contract.readState();
        expect(state2.caller).toEqual(walletAddress);
        expect(state2.caller2).toEqual(walletAddress);
      });

      it('should work with KV', async () => {
        const contract = await deployContract({});

        await contract.readState();
        const { cachedValue: kv } = await contract.getStorageValues(['__init']);
        expect(kv.get('__init')).toEqual('Welcome to kv');
      });
    });

    it('should rollback KV and state', async () => {
      const contract = await deployContract({ addToState: { fail: true } });

      await expect(contract.readState()).rejects.toThrowError();
      const { cachedValue: kv } = await contract.getStorageValues(['__init']);
      expect(kv.get('__init')).toEqual(undefined);
    });

    it('should fail to call __init function explicit', async () => {
      const contract = await deployContract({});

      await expect(contract.writeInteraction({ function: '__init' }, { strict: true })).rejects.toThrowError();
    });

    it('should properly apply modifications from __init', async () => {
      const contract = await deployContract({});

      const {
        cachedValue: { state }
      } = await contract.readState();

      expect(state.counter).toBe(2);

      await contract.writeInteraction({ function: 'nop' });
      await contract.writeInteraction({ function: 'nop' });

      const {
        cachedValue: { state: state2 }
      } = await contract.readState();
      expect(state2.counter).toStrictEqual(2);
    });

    it('should fail to access block data', async () => {
      const contract = await deployContract({ addToState: { accessBlock: true } });

      await expect(contract.readState()).rejects.toThrowError(
        'ConstructorError: SmartWeave.block.timestamp is not accessible in constructor context'
      );
    });

    it('should fail to access transaction data', async () => {
      const contract = await deployContract({ addToState: { accessTx: true } });

      await expect(contract.readState()).rejects.toThrowError(
        'ConstructorError: SmartWeave.transaction.id is not accessible in constructor context'
      );
    });

    it('should fail to access vrf data', async () => {
      const contract = await deployContract({ addToState: { accessVrf: true } });

      await expect(contract.readState()).rejects.toThrowError(
        'ConstructorError: SmartWeave.vrf.data is not accessible in constructor context'
      );
    });

    it('should fail to access transaction data in constructor', async () => {
      const contract = await deployContract({ addToState: { accessTx: true } });

      await expect(contract.readState()).rejects.toThrowError(
        'ConstructorError: SmartWeave.transaction.id is not accessible in constructor context'
      );
    });

    it('should be able to access SmartWeave global after constructor', async () => {
      const contract = await deployContract({});
      const contractB = await deployContract({});

      const { originalTxId } = (await contract.writeInteraction({
        function: 'callMe',
        contractB: (contractB as any)._contractTxId
      })) as WriteInteractionResponse;

      const {
        cachedValue: { state }
      } = await contract.readState();

      expect(state.blockId).toBeDefined();
      expect(state.txId).toBe(originalTxId);
      expect(state.vrf).toBe(undefined);
    });

    it('XX should be able to access SmartWeave internal writes after constructor', async () => {
      const foreignContract = await deployContract({ withKv: false, src: contractIrSrc });
      const contract = await deployContract({
        withKv: false,
        src: contractIrSrc,
        addToState: {
          foreignContract: foreignContract.txId()
        }
      });

      const response = await contract.viewState({
        function: 'read'
      });
      expect(response.type).toEqual('ok');
    });

    describe('Internal writes', () => {
      it('should throw when using internal writes in contract in __init', async () => {
        const writesInConstructorContract = await deployContract({
          src: helperContractSrc,
          withKv: false
        });

        await expect(writesInConstructorContract.readState()).rejects.toThrowError();
      });

      it('should read properly from external contract which uses constructor', async () => {
        const withConstructorContract = await deployContract({
          src: dummyContractSrc,
          withKv: false
        });
        const readExternalContract = await deployContract({
          src: contractIrSrc,
          withKv: false,
          addToState: { foreignContract: withConstructorContract.txId() }
        });

        expect((await readExternalContract.viewState({ function: 'read' })).result).toEqual({
          originalErrorMessages: {},
          originalValidity: {},
          result: 100,
          state: {
            counter: 100
          },
          type: 'ok'
        });
      });
    });
  });

  describe('with useConstructor = false', () => {
    describe('0 interactions', () => {
      it('should not call constructor on first read state', async () => {
        const contract = await deployContract({ withConstructor: false });

        const {
          cachedValue: { state }
        } = await contract.readState();

        expect(state.calls).toBeUndefined();

        const {
          cachedValue: { state: state2 }
        } = await contract.readState();

        expect(state2.calls).toBeUndefined();
      });
    });

    describe('with missing interactions', () => {
      it('should not call constructor on first read state and works with next readStates', async () => {
        const contract = await deployContract({ withConstructor: false });

        await contract.writeInteraction({ function: 'nop' });

        const {
          cachedValue: { state }
        } = await contract.readState();

        expect(state.calls).toBeDefined();
        expect(state.calls).toEqual(['nop']);
        await contract.writeInteraction({ function: 'nop' });
        await contract.writeInteraction({ function: 'nop' });

        const {
          cachedValue: { state: state2 }
        } = await contract.readState();

        expect(state2.calls).toBeDefined();
        expect(state2.calls).toEqual(['nop', 'nop', 'nop']);
      });
    });

    it('should NOT fail to call __init function', async () => {
      const contract = await deployContract({ withConstructor: false });

      await expect(contract.writeInteraction({ function: '__init' })).resolves.toBeDefined();
    });
  });
});
