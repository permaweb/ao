import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { PstState, PstContract } from '../../../contract/PstContract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

describe('Testing unsafe client in nested contracts with "skip" option', () => {
  let contractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst: PstContract;
  let contractTxId: string;

  beforeAll(async () => {
    arlocal = new ArLocal(1668, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');
    warp = WarpFactory.forLocal(1668).use(new DeployPlugin());

    ({ arweave } = warp);
    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../data/token-pst.js'), 'utf8');
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

    ({ contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    }));
    pst = warp.pst(contractTxId).setEvaluationOptions({
      unsafeClient: 'skip'
    }) as PstContract;
    pst.connect(wallet);
    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should read pst state and balance data', async () => {
    expect(await pst.currentState()).toEqual(initialState);

    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000);
    expect((await pst.currentBalance('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA')).balance).toEqual(23111222);
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669);
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

  it('should stop evaluation after evolve with unsafe code', async () => {
    expect((await pst.currentState()).balances[walletAddress]).toEqual(555114);

    const newSource = fs.readFileSync(path.join(__dirname, '../data/token-pst-unsafe.js'), 'utf8');

    const srcTx = await warp.createSource({ src: newSource }, wallet);
    const newSrcTxId = await warp.saveSource(srcTx);
    await mineBlock(warp);

    const evolveResponse = await pst.evolve(newSrcTxId);
    await mineBlock(warp);

    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });
    await mineBlock(warp);

    // note: should not evolve - the balance should be 555114 (the evolved version ads 555 to the balance)
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555114);

    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });
    await mineBlock(warp);

    // even with 'skip', the unsafe client on root contract will throw
    await expect(pst.readState()).rejects.toThrow('[SkipUnsafeError]');

    // testcase for new warp instance
    const newWarp = WarpFactory.forLocal(1668).use(new DeployPlugin());
    const freshPst = newWarp.contract(contractTxId).setEvaluationOptions({
      unsafeClient: 'allow'
    });
    const freshResult = await freshPst.readState();
    // note: should not evaluate at all the last interaction
    expect(Object.keys(freshResult.cachedValue.validity).length).toEqual(4);
    expect(Object.keys(freshResult.cachedValue.errorMessages).length).toEqual(0);

    expect(freshResult.cachedValue.validity[evolveResponse.originalTxId]).toBe(true);
  });
});
