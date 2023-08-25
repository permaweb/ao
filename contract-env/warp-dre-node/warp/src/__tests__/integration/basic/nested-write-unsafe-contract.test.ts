import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { PstContract, PstState } from '../../../contract/PstContract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import exp from 'constants';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

describe('Testing unsafe client in nested contracts with "skip" option', () => {
  let safeContractSrc, unsafeContractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp, warpUnsafe: Warp;
  let pst, foreignSafePst, foreignUnsafePst: PstContract;
  let contractTxId, foreignUnsafeContractTxId, foreignSafeContractTxId: string;

  beforeAll(async () => {
    arlocal = new ArLocal(1667, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');
    warp = WarpFactory.forLocal(1667).use(new DeployPlugin());
    warpUnsafe = WarpFactory.forLocal(1667).use(new DeployPlugin());

    ({ arweave } = warp);
    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    safeContractSrc = fs.readFileSync(path.join(__dirname, '../data/token-pst.js'), 'utf8');
    const stateFromFile: PstState = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/token-pst.json'), 'utf8'));

    initialState = {
      ...stateFromFile,
      ...{
        owner: walletAddress,
        balances: {
          ...stateFromFile.balances,
          [walletAddress]: 555669
        }
      }
    };

    ({ contractTxId } = await warp.createContract.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: safeContractSrc
    }));
    pst = warp.pst(contractTxId).setEvaluationOptions({
      unsafeClient: 'skip',
      internalWrites: true
    }) as PstContract;
    pst.connect(wallet);

    unsafeContractSrc = fs.readFileSync(path.join(__dirname, '../data/token-pst-unsafe.js'), 'utf8');
    ({ contractTxId: foreignUnsafeContractTxId } = await warp.createContract.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: unsafeContractSrc
    }));
    await mineBlock(warp);

    ({ contractTxId: foreignSafeContractTxId } = await warp.createContract.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: safeContractSrc
    }));
    await mineBlock(warp);

    // this contract will evolve to unsafe
    // in order to allow to make an evolve to unsafe
    // - the unsafeClient must be set to 'allow'
    foreignSafePst = warp
      .pst(foreignSafeContractTxId)
      .setEvaluationOptions({
        unsafeClient: 'allow',
        internalWrites: true
      })
      .connect(wallet) as PstContract;

    foreignUnsafePst = warpUnsafe
      .pst(foreignUnsafeContractTxId)
      .setEvaluationOptions({
        unsafeClient: 'allow',
        internalWrites: true
      })
      .connect(wallet) as PstContract;
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should properly transfer tokens', async () => {
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });

    await mineBlock(warp);

    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 555);
  });

  it('should properly perform write from foreign safe contract', async () => {
    await foreignSafePst.writeInteraction({
      function: 'writeForeign',
      contractTxId: contractTxId
    });
    await mineBlock(warp);

    const result = await pst.readState();
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(1);
  });

  it('should block write from foreign unsafe contract (1)', async () => {
    const unsafeWriteTx = await foreignUnsafePst.writeInteraction({
      function: 'writeForeign',
      contractTxId: contractTxId
    });
    await mineBlock(warp);

    const result = await pst.readState();
    expect(result.cachedValue.validity[unsafeWriteTx.originalTxId]).toBeFalsy();
    // should not change from previous test
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(1);
  });

  // this does not work properly. Second write from the unsafe contract
  // makes the previous write valid.
  it('should block write from foreign unsafe contract (2)', async () => {
    const unsafeWriteTx = await foreignUnsafePst.writeInteraction({
      function: 'writeForeign',
      contractTxId: contractTxId
    });
    await mineBlock(warp);

    const result = await pst.readState();
    expect(result.cachedValue.validity[unsafeWriteTx.originalTxId]).toBeFalsy();
    // should not change from previous test
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(1);
  });

  it('should block write from foreign safe contract that evolved to unsafe', async () => {
    const srcTx = await warp.createSource({ src: unsafeContractSrc }, wallet);
    const unsafeSrcTxId = await warp.saveSource(srcTx);
    await mineBlock(warp);

    await foreignSafePst.evolve(unsafeSrcTxId);
    await mineBlock(warp);

    const unsafeWriteTx = await foreignSafePst.writeInteraction({
      function: 'writeForeign',
      contractTxId: contractTxId
    });
    await mineBlock(warp);

    const result = await pst.readState();
    expect(result.cachedValue.validity[unsafeWriteTx.originalTxId]).toBeFalsy();
    // should not change from previous test
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(1);
  });
});
