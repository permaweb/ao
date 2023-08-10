import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Evaluate } from '@idena/vrf-js';
import elliptic from 'elliptic';
import { PstContract, PstState } from '../../../contract/PstContract';
import { InteractionsLoader } from '../../../core/modules/InteractionsLoader';
import { EvaluationOptions } from '../../../core/modules/StateEvaluator';
import { Warp } from '../../../core/Warp';
import { defaultCacheOptions, WarpFactory } from '../../../core/WarpFactory';
import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { ArweaveGatewayInteractionsLoader } from '../../../core/modules/impl/ArweaveGatewayInteractionsLoader';
import { LexicographicalInteractionsSorter } from '../../../core/modules/impl/LexicographicalInteractionsSorter';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import { VRFPlugin } from 'warp-contracts-plugin-vrf';

const EC = new elliptic.ec('secp256k1');
const key = EC.genKeyPair();
const pubKeyS = key.getPublic(true, 'hex');

const useWrongIndex = [];
const useWrongProof = [];

describe('Testing the Profit Sharing Token', () => {
  let contractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst: PstContract;
  let loader: InteractionsLoader;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(1823, false);
    await arlocal.start();

    arweave = Arweave.init({
      host: 'localhost',
      port: 1823,
      protocol: 'http'
    });

    loader = new VrfDecorator(arweave);
    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.custom(
      arweave,
      {
        ...defaultCacheOptions,
        inMemory: true
      },
      'local'
    )
      .useArweaveGateway()
      .setInteractionsLoader(loader)
      .build()
      .use(new DeployPlugin())
      .use(new VRFPlugin());

    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());
    walletAddress = await arweave.wallets.jwkToAddress(wallet);

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

    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    });

    // connecting to the PST contract
    pst = warp.pst(contractTxId);

    // connecting wallet to the PST contract
    pst.connect(wallet);

    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should properly return random numbers', async () => {
    await pst.writeInteraction({
      function: 'vrf'
    });
    await mineBlock(warp);
    const result = await pst.readState();
    const lastTxId = Object.keys(result.cachedValue.validity).pop();
    const vrf = (result.cachedValue.state as any).vrf[lastTxId];

    expect(vrf).not.toBeUndefined();
    expect(vrf['random_6_1'] == vrf['random_6_2']).toBe(true);
    expect(vrf['random_6_2'] == vrf['random_6_3']).toBe(true);
    expect(vrf['random_12_1'] == vrf['random_12_2']).toBe(true);
    expect(vrf['random_12_2'] == vrf['random_12_3']).toBe(true);
    expect(vrf['random_46_1'] == vrf['random_46_2']).toBe(true);
    expect(vrf['random_46_2'] == vrf['random_46_3']).toBe(true);
    expect(vrf['random_99_1'] == vrf['random_99_2']).toBe(true);
    expect(vrf['random_99_2'] == vrf['random_99_3']).toBe(true);
  });

  it('should throw if random cannot be verified', async () => {
    const { originalTxId: txId } = await pst.writeInteraction({
      function: 'vrf'
    });
    await mineBlock(warp);
    useWrongIndex.push(txId);
    await expect(pst.readState()).rejects.toThrow('Vrf verification failed.');
    useWrongIndex.pop();

    const { originalTxId: txId2 } = await pst.writeInteraction({
      function: 'vrf'
    });
    await mineBlock(warp);
    useWrongProof.push(txId2);
    await expect(pst.readState()).rejects.toThrow('Vrf verification failed.');
    useWrongProof.pop();
  });

  it('should allow to test VRF on a standard forLocal Warp instance', async () => {
    const localWarp = WarpFactory.forLocal(1823).use(new DeployPlugin()).use(new VRFPlugin());

    const { contractTxId: vrfContractTxId } = await localWarp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    });

    await mineBlock(localWarp);
    const vrfContract = localWarp.contract(vrfContractTxId).connect(wallet);
    await vrfContract.writeInteraction(
      {
        function: 'vrf'
      },
      { vrf: true }
    );
    const result = await vrfContract.readState();
    const lastTxId = Object.keys(result.cachedValue.validity).pop();
    const vrf = (result.cachedValue.state as any).vrf[lastTxId];

    expect(vrf).not.toBeUndefined();
    expect(vrf['random_6_1'] == vrf['random_6_2']).toBe(true);
    expect(vrf['random_6_2'] == vrf['random_6_3']).toBe(true);
    expect(vrf['random_12_1'] == vrf['random_12_2']).toBe(true);
    expect(vrf['random_12_2'] == vrf['random_12_3']).toBe(true);
    expect(vrf['random_46_1'] == vrf['random_46_2']).toBe(true);
    expect(vrf['random_46_2'] == vrf['random_46_3']).toBe(true);
    expect(vrf['random_99_1'] == vrf['random_99_2']).toBe(true);
    expect(vrf['random_99_2'] == vrf['random_99_3']).toBe(true);
  });

  it('should allow to test VRF on a standard forLocal Warp instance in strict mode', async () => {
    const localWarp = WarpFactory.forLocal(1823).use(new DeployPlugin()).use(new VRFPlugin());

    const { contractTxId: vrfContractTxId } = await localWarp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    });

    await mineBlock(localWarp);
    const vrfContract = localWarp.contract(vrfContractTxId).connect(wallet);
    await vrfContract.writeInteraction(
      {
        function: 'vrf'
      },
      { vrf: true, strict: true }
    );
    const result = await vrfContract.readState();
    const lastTxId = Object.keys(result.cachedValue.validity).pop();
    const vrf = (result.cachedValue.state as any).vrf[lastTxId];

    expect(vrf).not.toBeUndefined();
    expect(vrf['random_6_1'] == vrf['random_6_2']).toBe(true);
    expect(vrf['random_6_2'] == vrf['random_6_3']).toBe(true);
    expect(vrf['random_12_1'] == vrf['random_12_2']).toBe(true);
    expect(vrf['random_12_2'] == vrf['random_12_3']).toBe(true);
    expect(vrf['random_46_1'] == vrf['random_46_2']).toBe(true);
    expect(vrf['random_46_2'] == vrf['random_46_3']).toBe(true);
    expect(vrf['random_99_1'] == vrf['random_99_2']).toBe(true);
    expect(vrf['random_99_2'] == vrf['random_99_3']).toBe(true);
  });

  it('should allow to test VRF on a standard forLocal Warp instance with internal writes', async () => {
    const localWarp = WarpFactory.forLocal(1823).use(new DeployPlugin()).use(new VRFPlugin());

    const { contractTxId: vrfContractTxId } = await localWarp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    });

    await mineBlock(localWarp);
    const vrfContract = localWarp
      .contract(vrfContractTxId)
      .setEvaluationOptions({
        internalWrites: true
      })
      .connect(wallet);
    const result2 = await vrfContract.writeInteraction(
      {
        function: 'vrf'
      },
      { vrf: true, strict: true }
    );
    const result = await vrfContract.readState();
    const lastTxId = Object.keys(result.cachedValue.validity).pop();
    const vrf = (result.cachedValue.state as any).vrf[lastTxId];

    expect(vrf).not.toBeUndefined();
    expect(vrf['random_6_1'] == vrf['random_6_2']).toBe(true);
    expect(vrf['random_6_2'] == vrf['random_6_3']).toBe(true);
    expect(vrf['random_12_1'] == vrf['random_12_2']).toBe(true);
    expect(vrf['random_12_2'] == vrf['random_12_3']).toBe(true);
    expect(vrf['random_46_1'] == vrf['random_46_2']).toBe(true);
    expect(vrf['random_46_2'] == vrf['random_46_3']).toBe(true);
    expect(vrf['random_99_1'] == vrf['random_99_2']).toBe(true);
    expect(vrf['random_99_2'] == vrf['random_99_3']).toBe(true);
  });
});

class VrfDecorator extends ArweaveGatewayInteractionsLoader {
  constructor(protected readonly arweave: Arweave) {
    super(arweave, 'local');
  }

  async load(
    contractTxId: string,
    fromSortKey?: string,
    toSortKey?: string,
    evaluationOptions?: EvaluationOptions
  ): Promise<GQLNodeInterface[]> {
    const result = await super.load(contractTxId, fromSortKey, toSortKey, evaluationOptions);
    const arUtils = this.arweave.utils;

    const sorter = new LexicographicalInteractionsSorter(this.arweave);

    for (const r of result) {
      r.sortKey = await sorter.createSortKey(r.block.id, r.id, r.block.height);
      const data = arUtils.stringToBuffer(r.sortKey);
      const [index, proof] = Evaluate(key.getPrivate().toArray(), data);
      r.vrf = {
        index: useWrongIndex.includes(r.id)
          ? arUtils.bufferTob64Url(Uint8Array.of(1, 2, 3))
          : arUtils.bufferTob64Url(index),
        proof: useWrongProof.includes(r.id)
          ? 'pK5HGnXo_rJkZPJorIX7TBCAEikcemL2DgJaPB3Pfm2D6tZUdK9mDuBSRUkcHUDNnrO02O0-ogq1e32JVEuVvgR4i5YFa-UV9MEoHgHg4yv0e318WNfzNWPc9rlte7P7RoO57idHu5SSkm7Qj0f4pBjUR7lWODVKBYp9fEJ-PObZ'
          : arUtils.bufferTob64Url(proof),
        bigint: bufToBn(index).toString(),
        pubkey: pubKeyS
      };
    }

    return result;
  }
}

function bufToBn(buf) {
  const hex = [];
  const u8 = Uint8Array.from(buf);

  u8.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });

  return BigInt('0x' + hex.join(''));
}
