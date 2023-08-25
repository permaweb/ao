import Arweave from 'arweave';
import { ContractType } from '../../../contract/deploy/CreateContract';
import {
  ContractDefinition,
  ContractSource,
  ContractCache,
  SrcCache,
  SUPPORTED_SRC_CONTENT_TYPES
} from '../../ContractDefinition';
import { SMART_WEAVE_TAGS, WARP_TAGS } from '../../KnownTags';
import { Benchmark } from '../../../logging/Benchmark';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { ArweaveWrapper } from '../../../utils/ArweaveWrapper';
import { DefinitionLoader } from '../DefinitionLoader';
import { GW_TYPE } from '../InteractionsLoader';
import { TagsParser } from './TagsParser';
import { WasmSrc } from './wasm/WasmSrc';
import { Warp, WarpEnvironment } from '../../Warp';
import { Transaction } from '../../../utils/types/arweave-types';
import { BasicSortKeyCache } from '../../../cache/BasicSortKeyCache';

export class ContractDefinitionLoader implements DefinitionLoader {
  private readonly logger = LoggerFactory.INST.create('ContractDefinitionLoader');

  protected arweaveWrapper: ArweaveWrapper;
  private readonly tagsParser: TagsParser;

  constructor(private readonly arweave: Arweave, private readonly env: WarpEnvironment) {
    this.tagsParser = new TagsParser();
  }

  async load<State>(contractTxId: string, evolvedSrcTxId?: string): Promise<ContractDefinition<State>> {
    const benchmark = Benchmark.measure();
    const contract = await this.doLoad<State>(contractTxId, evolvedSrcTxId);
    this.logger.info(`Contract definition loaded in: ${benchmark.elapsed()}`);

    return contract;
  }

  async doLoad<State>(contractTxId: string, forcedSrcTxId?: string): Promise<ContractDefinition<State>> {
    const benchmark = Benchmark.measure();

    const contractTx = await this.arweaveWrapper.tx(contractTxId);
    const owner = await this.arweave.wallets.ownerToAddress(contractTx.owner);
    this.logger.debug('Contract tx and owner', benchmark.elapsed());
    benchmark.reset();

    const contractSrcTxId = forcedSrcTxId
      ? forcedSrcTxId
      : this.tagsParser.getTag(contractTx, SMART_WEAVE_TAGS.CONTRACT_SRC_TX_ID);
    const testnet = this.tagsParser.getTag(contractTx, WARP_TAGS.WARP_TESTNET) || null;
    if (testnet && this.env !== 'testnet') {
      throw new Error('Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.');
    }
    if (!testnet && this.env === 'testnet') {
      throw new Error('Trying to use non-testnet contract in a testnet env.');
    }
    const minFee = this.tagsParser.getTag(contractTx, SMART_WEAVE_TAGS.MIN_FEE);
    let manifest = null;
    const rawManifest = this.tagsParser.getTag(contractTx, WARP_TAGS.MANIFEST);
    if (rawManifest) {
      manifest = JSON.parse(rawManifest);
    }

    this.logger.debug('Tags decoding', benchmark.elapsed());
    benchmark.reset();
    const s = await this.evalInitialState(contractTx);
    this.logger.debug('init state', s);
    const initState = JSON.parse(s);
    this.logger.debug('Parsing src and init state', benchmark.elapsed());

    const { src, srcBinary, srcWasmLang, contractType, metadata, srcTx } = await this.loadContractSource(
      contractSrcTxId
    );

    return {
      txId: contractTxId,
      srcTxId: contractSrcTxId,
      src,
      srcBinary,
      srcWasmLang,
      initState,
      minFee,
      owner,
      contractType,
      metadata,
      manifest,
      contractTx: contractTx.toJSON(),
      srcTx,
      testnet
    };
  }

  async loadContractSource(contractSrcTxId: string): Promise<ContractSource> {
    const benchmark = Benchmark.measure();

    const contractSrcTx = await this.arweaveWrapper.tx(contractSrcTxId);
    const srcContentType = this.tagsParser.getTag(contractSrcTx, SMART_WEAVE_TAGS.CONTENT_TYPE);
    if (!SUPPORTED_SRC_CONTENT_TYPES.includes(srcContentType)) {
      throw new Error(`Contract source content type ${srcContentType} not supported`);
    }
    const contractType: ContractType = srcContentType == 'application/javascript' ? 'js' : 'wasm';

    const src =
      contractType == 'js'
        ? await this.arweaveWrapper.txDataString(contractSrcTxId)
        : await this.arweaveWrapper.txData(contractSrcTxId);

    let srcWasmLang;
    let wasmSrc: WasmSrc;
    let srcMetaData;
    if (contractType == 'wasm') {
      wasmSrc = new WasmSrc(src as Buffer);
      srcWasmLang = this.tagsParser.getTag(contractSrcTx, WARP_TAGS.WASM_LANG);
      if (!srcWasmLang) {
        throw new Error(`Wasm lang not set for wasm contract src ${contractSrcTxId}`);
      }
      srcMetaData = JSON.parse(this.tagsParser.getTag(contractSrcTx, WARP_TAGS.WASM_META));
    }

    this.logger.debug('Contract src tx load', benchmark.elapsed());
    benchmark.reset();

    return {
      src: contractType == 'js' ? (src as string) : null,
      srcBinary: contractType == 'wasm' ? wasmSrc.wasmBinary() : null,
      srcWasmLang,
      contractType,
      metadata: srcMetaData,
      srcTx: contractSrcTx.toJSON()
    };
  }

  private async evalInitialState(contractTx: Transaction): Promise<string> {
    if (this.tagsParser.getTag(contractTx, WARP_TAGS.INIT_STATE)) {
      return this.tagsParser.getTag(contractTx, WARP_TAGS.INIT_STATE);
    } else if (this.tagsParser.getTag(contractTx, WARP_TAGS.INIT_STATE_TX)) {
      const stateTX = this.tagsParser.getTag(contractTx, WARP_TAGS.INIT_STATE_TX);
      return this.arweaveWrapper.txDataString(stateTX);
    } else {
      return this.arweaveWrapper.txDataString(contractTx.id);
    }
  }

  type(): GW_TYPE {
    return 'arweave';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setCache(cache: BasicSortKeyCache<ContractDefinition<unknown>>): void {
    throw new Error('No cache implemented for this loader');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setSrcCache(cache: BasicSortKeyCache<SrcCache>): void {
    throw new Error('No cache implemented for this loader');
  }

  getCache(): BasicSortKeyCache<ContractCache<unknown>> {
    throw new Error('No cache implemented for this loader');
  }

  getSrcCache(): BasicSortKeyCache<SrcCache> {
    throw new Error('No cache implemented for this loader');
  }

  set warp(warp: Warp) {
    this.arweaveWrapper = new ArweaveWrapper(warp);
  }
}
