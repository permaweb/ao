import fs from 'fs';

import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { Warp } from '../../../core/Warp';
import { WarpFactory, defaultCacheOptions } from '../../../core/WarpFactory';
import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { WarpGatewayContractDefinitionLoader } from '../../../core/modules/impl/WarpGatewayContractDefinitionLoader';
import { DefaultEvaluationOptions } from '../../../core/modules/StateEvaluator';
import { LexicographicalInteractionsSorter } from '../../../core/modules/impl/LexicographicalInteractionsSorter';
import { LevelDbCache } from '../../../cache/impl/LevelDbCache';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

interface ExampleContractState {
  counter: number;
}

describe('Testing WarpGatewayContractDefinitionLoader', () => {
  let contractSrc: string;
  let wallet: JWKInterface;
  let loader: WarpGatewayContractDefinitionLoader;

  const evalOptions = new DefaultEvaluationOptions();
  let sorter: LexicographicalInteractionsSorter;
  let interactions: GQLNodeInterface[];

  let arlocal: ArLocal;
  let warp: Warp;
  let contract: Contract<ExampleContractState>;

  beforeAll(async () => {
    LoggerFactory.INST.logLevel('error');
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    const port = 1832;
    arlocal = new ArLocal(port, false);
    await arlocal.start();

    warp = WarpFactory.forLocal(port).use(new DeployPlugin());

    const { arweave } = warp;

    const contractCache = new LevelDbCache<any>({ ...defaultCacheOptions, inMemory: true });
    const srcCache = new LevelDbCache<any>({ ...defaultCacheOptions, inMemory: true });

    loader = new WarpGatewayContractDefinitionLoader(arweave, contractCache, srcCache, 'local');
    loader.warp = warp;
    sorter = new LexicographicalInteractionsSorter(arweave);

    ({ jwk: wallet } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../data/contract-load-first.js'), 'utf8');
    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({
        counter: 10
      }),
      src: contractSrc
    });

    contract = warp
      .contract<ExampleContractState>(contractTxId)
      .setEvaluationOptions({
        maxInteractionEvaluationTimeSeconds: 1,
        mineArLocalBlocks: false
      })
      .connect(wallet);

    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('loads contract definition when cache is empty', async () => {
    // Cache is empty
    loader.getCache().delete(contract.txId());
    expect(await loader.getCache().get({ key: contract.txId(), sortKey: 'cd' })).toBeFalsy();

    // Load contract
    const loaded = await loader.load(contract.txId());
    expect(loaded.txId).toBe(contract.txId());
    expect(loaded.src).toBe(contractSrc);

    // Contract is in its cache
    expect(await loader.getCache().get({ key: loaded.txId, sortKey: 'cd' })).toBeTruthy();
    expect(await loader.getSrcCache().get({ key: loaded.txId, sortKey: 'cd' })).toBeFalsy();

    // Source is in its cache
    expect(await loader.getCache().get({ key: loaded.srcTxId, sortKey: 'src' })).toBeFalsy();
    expect(await loader.getSrcCache().get({ key: loaded.srcTxId, sortKey: 'src' })).toBeTruthy();
  });

  it('loads contract definition when cache contains given definition', async () => {
    // Loads contract and source
    let loaded = await loader.load(contract.txId());

    // Modify source in cache
    let source = await loader.getSrcCache().get({ key: loaded.srcTxId, sortKey: 'src' });
    expect(source).toBeTruthy();
    source!.cachedValue.src = fs.readFileSync(path.join(__dirname, '../data/token-evolve.js'), 'utf8');
    await loader.getSrcCache().put({ key: loaded.srcTxId, sortKey: 'src' }, source!.cachedValue);

    // Load again, modified cache should be returned
    loaded = await loader.load(contract.txId());
    expect(loaded.src).toBe(source!.cachedValue.src);
  });

  it('loads contract definition with an evolved source code', async () => {
    const newSource = fs.readFileSync(path.join(__dirname, '../data/contract-load-second.js'), 'utf8');

    const srcTx = await warp.createSource({ src: newSource }, wallet);
    const newSrcTxId = await warp.saveSource(srcTx);
    await mineBlock(warp);

    await contract.evolve(newSrcTxId);
    await mineBlock(warp);

    const loaded = await loader.load(contract.txId(), newSrcTxId);
    expect(loaded.src).toBe(newSource);
    expect(loaded.srcTxId).toBe(newSrcTxId);
  });
});
