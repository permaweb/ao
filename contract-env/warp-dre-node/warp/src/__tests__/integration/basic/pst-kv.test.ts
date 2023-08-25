import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { PstState, PstContract } from '../../../contract/PstContract';
import { Warp } from '../../../core/Warp';
import { DEFAULT_LEVEL_DB_LOCATION, WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

describe('Testing the Profit Sharing Token', () => {
  let contractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst: PstContract;

  let contractTxId;
  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(2222, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(2222).use(new DeployPlugin());

    ({ arweave } = warp);
    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../data/kv-storage.js'), 'utf8');
    const stateFromFile: PstState = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/token-pst.json'), 'utf8'));

    initialState = {
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

    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 555);
    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000 + 555);
  });

  it('should read pst state and balance ignoring dry runs', async () => {
    await pst.dryWrite({
      function: 'transfer',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 111
    });

    await mineBlock(warp);

    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 555);
    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000 + 555);
  });

  it('should properly view contract state', async () => {
    const result = await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M');
    expect(result.balance).toEqual(10000000 + 555);
    expect(result.ticker).toEqual('EXAMPLE_PST_TOKEN');
    expect(result.target).toEqual('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M');
  });

  it('should properly read storage value', async () => {
    expect((await pst.getStorageValues([walletAddress])).cachedValue.get(walletAddress)).toEqual(555669 - 555);
    expect(
      (await pst.getStorageValues(['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'])).cachedValue.get(
        'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
      )
    ).toEqual(10000000 + 555);
    expect(
      (await pst.getStorageValues(['33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'])).cachedValue.get(
        '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'
      )
    ).toEqual(23111222);
    expect((await pst.getStorageValues(['foo'])).cachedValue.get('foo')).toBeNull();
  });
});
