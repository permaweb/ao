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

// note: each tests suit (i.e. file with tests that Jest is running concurrently
// with another files has to have ArLocal set to a different port!)
const AR_PORT = 1825;

describe('Testing the Profit Sharing Token', () => {
  let contractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let contractTxId: string;
  let pst: PstContract;

  const actualFetch = global.fetch;
  let responseData = {
    sortKey: '',
    state: {}
  };
  let firstSortKey = '';
  const remoteCalls = {
    total: 0,
    measure: function () {
      const self = this;
      const start = self.total;
      return {
        diff: () => self.total - start
      };
    }
  };

  const localWarp = async function () {
    if (!arlocal) {
      arlocal = new ArLocal(AR_PORT, false);
      await arlocal.start();
    }
    return WarpFactory.forLocal(AR_PORT).use(new DeployPlugin());
  };

  const autoSyncPst = async function () {
    const autoSyncPst = (await localWarp()).pst(contractTxId);
    autoSyncPst.setEvaluationOptions({
      remoteStateSyncEnabled: true
    });
    return autoSyncPst;
  };

  beforeAll(async () => {
    LoggerFactory.INST.logLevel('error');

    warp = await localWarp();
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

    // deploying contract using the new SDK.
    ({ contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    }));

    // connecting to the PST contract
    pst = warp.pst(contractTxId);

    // connecting wallet to the PST contract
    pst.connect(wallet);

    await mineBlock(warp);

    jest.spyOn(global, 'fetch').mockImplementation(async (input: string, init) => {
      if (input.includes(pst.evaluationOptions().remoteStateSyncSource)) {
        remoteCalls.total++;
        return Promise.resolve({
          json: () => Promise.resolve(responseData),
          ok: true,
          status: 200
        }) as Promise<Response>;
      }
      return actualFetch(input, init);
    });
  });

  afterAll(async () => {
    await arlocal.stop();
    jest.restoreAllMocks();
  });

  it('should read pst state and balance data', async () => {
    const dreCalls = remoteCalls.measure();
    const state = await pst.readState();
    firstSortKey = state.sortKey;
    responseData.sortKey = state.sortKey;
    responseData.state = state.cachedValue.state;

    expect(state.cachedValue.state).toEqual(initialState);
    const syncPst = await autoSyncPst();
    expect(await syncPst.currentState()).toEqual(initialState);

    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000);
    expect((await syncPst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000);
    expect((await pst.currentBalance('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA')).balance).toEqual(23111222);
    expect((await syncPst.currentBalance('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA')).balance).toEqual(23111222);
    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669);
    expect((await syncPst.currentBalance(walletAddress)).balance).toEqual(555669);
    expect(dreCalls.diff()).toEqual(4);
  });

  it('should properly transfer tokens and ignore remote source', async () => {
    const dreCalls = remoteCalls.measure();
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 100
    });

    await mineBlock(warp);
    const state = await pst.readState();
    responseData.sortKey = state.sortKey;
    responseData.state = state.cachedValue.state;

    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 100);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 100);
    expect(dreCalls.diff()).toEqual(0);
  });

  it('should transfer tokens and read state from remote source', async () => {
    const dreCalls = remoteCalls.measure();
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 450
    });

    await mineBlock(warp);

    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 550);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 550);

    const syncPst = await autoSyncPst();
    expect((await syncPst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(
      10000000 + 100
    );
    expect((await syncPst.currentState()).balances[walletAddress]).toEqual(555669 - 100);

    syncPst.setEvaluationOptions({
      remoteStateSyncEnabled: false
    });
    expect((await syncPst.currentState()).balances[walletAddress]).toEqual(555669 - 550);
    expect((await syncPst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(
      10000000 + 550
    );
    expect(dreCalls.diff()).toEqual(2);
  });

  it('should read pst state for previous sortKey', async () => {
    const dreCalls = remoteCalls.measure();

    const state = await pst.readState(firstSortKey);
    expect(state.cachedValue.state.balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000);
    expect(state.cachedValue.state.balances['33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA']).toEqual(23111222);

    expect(state.cachedValue.state).toEqual(initialState);
    const syncPst = await autoSyncPst();

    const syncState = await syncPst.readState(firstSortKey);
    expect(await syncState.cachedValue.state).toEqual(initialState);
    expect(syncState.cachedValue.state.balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000);
    expect(syncState.cachedValue.state.balances['33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA']).toEqual(23111222);
    expect(dreCalls.diff()).toEqual(1);
  });
});
