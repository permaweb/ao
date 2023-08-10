import Arweave from 'arweave';
import { ContractDefinitionLoader } from './ContractDefinitionLoader';
import { Buffer } from 'warp-isomorphic';
import { GW_TYPE } from '../InteractionsLoader';
import { ContractCache, ContractDefinition, ContractSource, SrcCache } from '../../ContractDefinition';
import { WARP_TAGS } from '../../KnownTags';
import { Benchmark } from '../../../logging/Benchmark';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { ArweaveWrapper } from '../../../utils/ArweaveWrapper';
import { DefinitionLoader } from '../DefinitionLoader';
import { WasmSrc } from './wasm/WasmSrc';
import { Warp, WarpEnvironment } from '../../Warp';
import { TagsParser } from './TagsParser';
import { CacheKey, SortKeyCacheResult } from '../../../cache/SortKeyCache';
import { Transaction } from '../../../utils/types/arweave-types';
import { getJsonResponse, stripTrailingSlash } from '../../../utils/utils';
import { BasicSortKeyCache } from '../../../cache/BasicSortKeyCache';

/**
 * An extension to {@link ContractDefinitionLoader} that makes use of
 * Warp Gateway ({@link https://github.com/redstone-finance/redstone-sw-gateway})
 * to load Contract Data.
 *
 * If the contract data is not available on Warp Gateway - it fallbacks to default implementation
 * in {@link ContractDefinitionLoader} - i.e. loads the definition from Arweave gateway.
 */
export class WarpGatewayContractDefinitionLoader implements DefinitionLoader {
  private readonly rLogger = LoggerFactory.INST.create('WarpGatewayContractDefinitionLoader');
  private contractDefinitionLoader: ContractDefinitionLoader;
  private arweaveWrapper: ArweaveWrapper;
  private readonly tagsParser: TagsParser;
  private _warp: Warp;

  constructor(
    arweave: Arweave,
    private definitionCache: BasicSortKeyCache<ContractCache<unknown>>,
    private srcCache: BasicSortKeyCache<SrcCache>,
    private readonly env: WarpEnvironment
  ) {
    this.contractDefinitionLoader = new ContractDefinitionLoader(arweave, env);
    this.tagsParser = new TagsParser();
  }

  async load<State>(contractTxId: string, evolvedSrcTxId?: string): Promise<ContractDefinition<State>> {
    const result = await this.getFromCache<State>(contractTxId, evolvedSrcTxId);
    if (result) {
      this.rLogger.debug('WarpGatewayContractDefinitionLoader: Hit from cache!');
      // LevelDB serializes Buffer to an object with 'type' and 'data' fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (result.contractType == 'wasm' && (result.srcBinary as any).data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.srcBinary = Buffer.from((result.srcBinary as any).data);
      }
      this.verifyEnv(result);
      return result;
    }
    const benchmark = Benchmark.measure();
    const contract = await this.doLoad<State>(contractTxId, evolvedSrcTxId);
    this.rLogger.info(`Contract definition loaded in: ${benchmark.elapsed()}`);
    this.verifyEnv(contract);

    await this.putToCache(contractTxId, contract, evolvedSrcTxId);

    return contract;
  }

  async doLoad<State>(contractTxId: string, forcedSrcTxId?: string): Promise<ContractDefinition<State>> {
    try {
      const baseUrl = stripTrailingSlash(this._warp.gwUrl());
      const result: ContractDefinition<State> = await getJsonResponse(
        fetch(`${baseUrl}/gateway/contract?txId=${contractTxId}${forcedSrcTxId ? `&srcTxId=${forcedSrcTxId}` : ''}`)
      );

      if (result.srcBinary != null && !(result.srcBinary instanceof Buffer)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.srcBinary = Buffer.from((result.srcBinary as any).data);
      }
      if (result.srcBinary) {
        const wasmSrc = new WasmSrc(result.srcBinary);
        result.srcBinary = wasmSrc.wasmBinary();
        let sourceTx;
        if (result.srcTx) {
          sourceTx = new Transaction({ ...result.srcTx });
        } else {
          sourceTx = await this.arweaveWrapper.tx(result.srcTxId);
        }
        const srcMetaData = JSON.parse(this.tagsParser.getTag(sourceTx, WARP_TAGS.WASM_META));
        result.metadata = srcMetaData;
      }
      result.contractType = result.src ? 'js' : 'wasm';
      return result;
    } catch (e) {
      this.rLogger.warn('Falling back to default contracts loader', e);
      return await this.contractDefinitionLoader.doLoad(contractTxId, forcedSrcTxId);
    }
  }

  async loadContractSource(contractSrcTxId: string): Promise<ContractSource> {
    return await this.contractDefinitionLoader.loadContractSource(contractSrcTxId);
  }

  type(): GW_TYPE {
    return 'warp';
  }

  setCache(cache: BasicSortKeyCache<ContractCache<unknown>>): void {
    this.definitionCache = cache;
  }

  setSrcCache(cacheSrc: BasicSortKeyCache<SrcCache>): void {
    this.srcCache = cacheSrc;
  }

  getCache(): BasicSortKeyCache<ContractCache<unknown>> {
    return this.definitionCache;
  }

  getSrcCache(): BasicSortKeyCache<SrcCache> {
    return this.srcCache;
  }

  private verifyEnv(def: ContractDefinition<unknown>): void {
    if (def.testnet && this.env !== 'testnet') {
      throw new Error('Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.');
    }
    if (!def.testnet && this.env === 'testnet') {
      throw new Error('Trying to use non-testnet contract in a testnet env.');
    }
  }

  // Gets ContractDefinition and ContractSource from two caches and returns a combined structure
  private async getFromCache<State>(contractTxId: string, srcTxId?: string): Promise<ContractDefinition<State> | null> {
    const contract = (await this.definitionCache.get(new CacheKey(contractTxId, 'cd'))) as SortKeyCacheResult<
      ContractCache<State>
    >;
    if (!contract) {
      return null;
    }

    const src = await this.srcCache.get(new CacheKey(srcTxId || contract.cachedValue.srcTxId, 'src'));
    if (!src) {
      return null;
    }
    return { ...contract.cachedValue, ...src.cachedValue };
  }

  // Divides ContractDefinition into entries in two caches to avoid duplicates
  private async putToCache<State>(
    contractTxId: string,
    value: ContractDefinition<State>,
    srcTxId?: string
  ): Promise<void> {
    const src = new SrcCache(value);
    const contract = new ContractCache(value);
    await this.definitionCache.put({ key: contractTxId, sortKey: 'cd' }, contract);
    await this.srcCache.put({ key: srcTxId || contract.srcTxId, sortKey: 'src' }, src);
  }

  set warp(warp: Warp) {
    this._warp = warp;
    this.arweaveWrapper = new ArweaveWrapper(warp);
    this.contractDefinitionLoader.warp = warp;
  }
}
