import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { PstState, PstContract } from '../../../contract/PstContract';
import { Warp } from '../../../core/Warp';
import { DEFAULT_LEVEL_DB_LOCATION, defaultCacheOptions, WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

// note: each tests suit (i.e. file with tests that Jest is running concurrently
// with another files has to have ArLocal set to a different port!)
const AR_PORT = 1826;

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

      arweave = Arweave.init({
        host: 'localhost',
        port: AR_PORT,
        protocol: 'http'
      });
    }

    return WarpFactory.forLocal(AR_PORT, arweave, { ...defaultCacheOptions, inMemory: true }).use(new DeployPlugin());
  };

  const autoSyncPst = async function () {
    // const autoSyncPst = warp.pst(contractTxId);
    const autoSyncPst = (await localWarp()).pst(contractTxId);
    autoSyncPst.setEvaluationOptions({
      remoteStateSyncEnabled: true
    });
    return autoSyncPst;
  };

  beforeAll(async () => {
    LoggerFactory.INST.logLevel('error');

    warp = await localWarp();
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
      src: contractSrc,
      evaluationManifest: {
        evaluationOptions: {
          useKVStorage: true
        }
      }
    }));

    pst = warp.pst(contractTxId);
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

    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 100);
    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000 + 100);
    expect(dreCalls.diff()).toEqual(0);
  });

  it('should properly transfer tokens and read state from remote source', async () => {
    const dreCalls = remoteCalls.measure();
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 400
    });

    await mineBlock(warp);

    expect((await pst.currentBalance(walletAddress)).balance).toEqual(555669 - 500);
    expect((await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(10000000 + 500);

    expect(dreCalls.diff()).toEqual(0);
  });

  it('should properly read storage value', async () => {
    expect((await pst.getStorageValues([walletAddress])).cachedValue.get(walletAddress)).toEqual(555669 - 500);
    expect(
      (await pst.getStorageValues(['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'])).cachedValue.get(
        'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
      )
    ).toEqual(10000000 + 500);
    expect(
      (await pst.getStorageValues(['33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'])).cachedValue.get(
        '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'
      )
    ).toEqual(23111222);
    expect((await pst.getStorageValues(['foo'])).cachedValue.get('foo')).toBeNull();
    fs.rmSync(`${DEFAULT_LEVEL_DB_LOCATION}/kv/ldb/${contractTxId}`, { recursive: true });
  });

  it('should properly calculate kv storage with auto sync', async () => {
    const dreCalls = remoteCalls.measure();

    const syncPst = await autoSyncPst();

    expect(await syncPst.currentState()).toEqual(initialState);
    expect((await syncPst.currentBalance(walletAddress)).balance).toEqual(555669 - 500);
    expect((await syncPst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).balance).toEqual(
      10000000 + 500
    );

    expect((await syncPst.getStorageValues([walletAddress])).cachedValue.get(walletAddress)).toEqual(555669 - 500);
    expect(
      (await syncPst.getStorageValues(['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'])).cachedValue.get(
        'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
      )
    ).toEqual(10000000 + 500);
    expect(
      (await syncPst.getStorageValues(['33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'])).cachedValue.get(
        '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'
      )
    ).toEqual(23111222);
    expect((await syncPst.getStorageValues(['foo'])).cachedValue.get('foo')).toBeNull();
    expect(dreCalls.diff()).toEqual(0);
  });
});
