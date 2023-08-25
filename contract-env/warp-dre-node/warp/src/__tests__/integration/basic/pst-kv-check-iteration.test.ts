import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { PstContract, PstState } from '../../../contract/PstContract';
import { Warp } from '../../../core/Warp';
import { DEFAULT_LEVEL_DB_LOCATION, WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { WriteInteractionResponse } from '../../../contract/Contract';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

describe('Testing the PST kv storage range access', () => {
  let contractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let aliceWallet: JWKInterface;
  let aliceWalletAddress: string;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst: PstContract;
  let interaction: WriteInteractionResponse;

  let contractTxId;
  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(2224, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(2224).use(new DeployPlugin());

    ({ arweave } = warp);
    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());
    ({ jwk: aliceWallet, address: aliceWalletAddress } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../data/kv-storage-range.js'), 'utf8');
    const stateFromFile: PstState = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/token-pst.json'), 'utf8'));

    const initialState = {
      ...stateFromFile,
      ...{
        owner: walletAddress
      }
    };

    // deploying contract using the new SDK.
    ({ contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    }));

    // connecting to the PST contract
    pst = warp.pst(contractTxId).setEvaluationOptions({
      useKVStorage: true
    }) as PstContract;
    pst.connect(wallet);

    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
    fs.rmSync(`${DEFAULT_LEVEL_DB_LOCATION}/kv/ldb/${contractTxId}`, { recursive: true });
  });

  it('should initialize', async () => {
    // this is done to "initialize" the state
    await pst.writeInteraction({
      function: 'mint',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 10000000
    });
    await mineBlock(warp);

    await pst.writeInteraction({
      function: 'mint',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 1_000
    });
    await mineBlock(warp);

    await pst.writeInteraction({
      function: 'mint',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 10_000
    });
    await mineBlock(warp);

    interaction = await pst.writeInteraction({
      function: 'mint',
      target: '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA',
      qty: 23111222
    });
    await mineBlock(warp);

    await pst.writeInteraction({
      function: 'mint',
      target: walletAddress,
      qty: 555669
    });
    await mineBlock(warp);
  });

  it('should read pst state and balance data', async () => {
    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10_000);
    expect((await pst.currentBalance('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA')).balance).toEqual(23111222);
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669);
  });

  it('should properly transfer tokens', async () => {
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });

    await mineBlock(warp);
    await mineBlock(warp);

    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 100
    });

    await mineBlock(warp);

    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 655);
    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10_000 + 655);
  });

  it('should properly check minted status', async () => {
    const viewResult = await pst.viewState<unknown, MintedResult>({ function: 'minted' });

    await mineBlock(warp);

    expect(viewResult.result.minted).toEqual(23676891);
  });

  it('should write check', async () => {
    await pst.writeInteraction({
      function: 'writeCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 200_000
    });

    await pst.writeInteraction({
      function: 'writeCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 1_500
    });

    await pst.writeInteraction({
      function: 'writeCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 2_500
    });

    await pst.writeInteraction({
      function: 'writeCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 3_500
    });

    await pst.writeInteraction({ function: 'writeCheck', target: aliceWalletAddress, qty: 200_000 });

    await mineBlock(warp);

    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 655);
    expect((await pst.currentBalance(aliceWalletAddress)).balance).toEqual(0);
  });

  it('should cash check', async () => {
    const alicePst = warp.pst(contractTxId).setEvaluationOptions({
      useKVStorage: true
    }) as PstContract;

    alicePst.connect(aliceWallet);
    await alicePst.writeInteraction({ function: 'cashCheck', target: walletAddress });

    await mineBlock(warp);

    expect((await pst.currentBalance(aliceWalletAddress)).balance).toEqual(200_000);
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 655 - 200_000);
    expect(
      (await pst.getStorageValues(['check.' + walletAddress + '.' + aliceWalletAddress])).cachedValue.get(
        'check.' + walletAddress + '.' + aliceWalletAddress
      )
    ).toBeNull();
  });

  it('should withdraw last check', async () => {
    expect((await pst.viewState<unknown, ChecksWrittenResult>({ function: 'checksActive' })).result.total).toEqual(
      207_500
    );

    await pst.writeInteraction({
      function: 'withdrawLastCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
    });
    await pst.writeInteraction({
      function: 'withdrawLastCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
    });
    await pst.writeInteraction({
      function: 'withdrawLastCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
    });

    await mineBlock(warp);

    expect((await pst.viewState<unknown, ChecksWrittenResult>({ function: 'checksActive' })).result.total).toEqual(
      200_000
    );
  });

  it('should not be able to write check', async () => {
    const wrongCheck = await pst.writeInteraction({
      function: 'writeCheck',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 360_000
    });

    await mineBlock(warp);

    expect(
      (
        await pst.getStorageValues(['check.' + walletAddress + '.uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M.0001'])
      ).cachedValue.get('check.' + walletAddress + '.uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M.0001')
    ).toBe(200_000);
    expect((await pst.readState()).cachedValue.errorMessages[wrongCheck.originalTxId]).toMatch(
      'Caller balance 355014 not high enough to write check for 360000!'
    );
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 655 - 200_000);
  });
});

export interface MintedResult {
  minted: number;
}
export interface ChecksWrittenResult {
  total: number;
}
