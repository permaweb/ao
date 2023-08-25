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
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

describe('Testing unsafe client in nested contracts with "skip" option', () => {
  let safeContractSrc, unsafeContractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst, foreignSafePst: PstContract;
  let foreignUnsafeContractTxId, foreignSafeContractTxId: string;

  beforeAll(async () => {
    arlocal = new ArLocal(1666, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');
    warp = WarpFactory.forLocal(1666).use(new DeployPlugin());

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

    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: safeContractSrc
    });
    pst = warp.pst(contractTxId).setEvaluationOptions({
      unsafeClient: 'skip'
    }) as PstContract;
    pst.connect(wallet);

    unsafeContractSrc = fs.readFileSync(path.join(__dirname, '../data/token-pst-unsafe.js'), 'utf8');
    ({ contractTxId: foreignUnsafeContractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: unsafeContractSrc
    }));
    await mineBlock(warp);

    ({ contractTxId: foreignSafeContractTxId } = await warp.deploy({
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
        unsafeClient: 'allow'
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

  it('should properly read foreign safe contract', async () => {
    await foreignSafePst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });
    await mineBlock(warp);

    const readSafeTx = await pst.writeInteraction({
      function: 'readForeign',
      contractTxId: foreignSafeContractTxId
    });
    await mineBlock(warp);

    const result = await pst.readState();
    expect(result.cachedValue.validity[readSafeTx.originalTxId]).toBe(true);
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(1);
  });

  it('should stop evaluation of a nested unsafe contract (readContractState)', async () => {
    const readUnsafeTx = await pst.writeInteraction({
      function: 'readForeign',
      contractTxId: foreignUnsafeContractTxId
    });
    await mineBlock(warp);

    const result = await pst.readState();

    expect(Object.keys(result.cachedValue.validity).length == 2);
    expect(Object.keys(result.cachedValue.errorMessages).length == 2);

    expect(result.cachedValue.validity[readUnsafeTx.originalTxId]).toBe(false);
    expect(result.cachedValue.errorMessages[readUnsafeTx.originalTxId]).toMatch(
      'Skipping evaluation of the unsafe contract'
    );

    // should not change from previous test
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(1);
  });

  it('should skip evaluation when foreign safe contract evolves to unsafe (readContractState)', async () => {
    const readSafeTx = await pst.writeInteraction({
      function: 'readForeign',
      contractTxId: foreignSafeContractTxId
    });
    await mineBlock(warp);

    const srcTx = await warp.createSource({ src: unsafeContractSrc }, wallet);
    const unsafeSrcTxId = await warp.saveSource(srcTx);
    await mineBlock(warp);

    await foreignSafePst.evolve(unsafeSrcTxId);
    await mineBlock(warp);

    await foreignSafePst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });
    await mineBlock(warp);

    const readEvolvedToUnsafeTx = await pst.writeInteraction({
      function: 'readForeign',
      contractTxId: foreignSafeContractTxId
    });

    const lastWrittenTx = await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });
    await mineBlock(warp);

    const result = await pst.readState();
    expect(result.cachedValue.validity[readSafeTx.originalTxId]).toBe(true);
    expect(result.cachedValue.validity[readEvolvedToUnsafeTx.originalTxId]).toBe(false);

    // note: the transactions after foreign read from evolved to unsafe contract should be processed normally
    expect(result.cachedValue.validity[lastWrittenTx.originalTxId]).toBe(true);

    // should be incremented by one - only the first read from this testcase should be successful
    expect((result.cachedValue.state as any).foreignCallsCounter).toEqual(2);
  });
});
