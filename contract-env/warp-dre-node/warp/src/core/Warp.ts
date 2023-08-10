import Arweave from 'arweave';
import { Contract, InnerCallData } from '../contract/Contract';
import {
  ArWallet,
  BundlrNodeType,
  ContractData,
  ContractDeploy,
  CreateContract,
  FromSrcTxContractData
} from '../contract/deploy/CreateContract';
import { HandlerBasedContract } from '../contract/HandlerBasedContract';
import { PstContract } from '../contract/PstContract';
import { PstContractImpl } from '../contract/PstContractImpl';
import { Testing, Wallet } from '../contract/testing/Testing';
import { DefinitionLoader } from './modules/DefinitionLoader';
import { ExecutorFactory } from './modules/ExecutorFactory';
import { HandlerApi } from './modules/impl/HandlerExecutorFactory';
import { InteractionsLoader } from './modules/InteractionsLoader';
import { EvalStateResult, StateEvaluator } from './modules/StateEvaluator';
import { WarpBuilder } from './WarpBuilder';
import {
  WarpPluginType,
  WarpPlugin,
  knownWarpPlugins,
  knownWarpPluginsPartial,
  WarpKnownPluginType
} from './WarpPlugin';
import { SortKeyCache } from '../cache/SortKeyCache';
import { ContractDefinition, SrcCache } from './ContractDefinition';
import { CustomSignature } from '../contract/Signature';
import { Transaction } from '../utils/types/arweave-types';
import { DEFAULT_LEVEL_DB_LOCATION, WARP_GW_URL } from './WarpFactory';
import { LevelDbCache } from '../cache/impl/LevelDbCache';
import { SourceData } from '../contract/deploy/Source';
import { Signer, DataItem } from 'warp-arbundles';
import { BasicSortKeyCache } from '../cache/BasicSortKeyCache';

export type WarpEnvironment = 'local' | 'testnet' | 'mainnet' | 'custom';
export type KVStorageFactory = (contractTxId: string) => SortKeyCache<unknown>;

/**
 * The Warp "motherboard" ;-).
 * This is the base class that supplies the implementation of the SmartWeave protocol
 * Allows to plug-in different implementation of all the modules defined in the constructor.
 *
 * After being fully configured, it allows to "connect" to
 * contract and perform operations on them (see {@link Contract})
 */

export class Warp {
  private _createContract: CreateContract;
  private _gwUrl = WARP_GW_URL;

  private get createContract(): CreateContract {
    if (!this._createContract) {
      if (this.plugins.has('deploy')) {
        const deployPlugin = this.loadPlugin<Warp, CreateContract>('deploy');
        this._createContract = deployPlugin.process(this);
      } else {
        throw new Error(`In order to use CreateContract methods please attach DeployPlugin.`);
      }
    }
    return this._createContract;
  }

  readonly testing: Testing;
  kvStorageFactory: KVStorageFactory;
  whoAmI: string;

  private readonly plugins: Map<WarpPluginType, WarpPlugin<unknown, unknown>> = new Map();

  constructor(
    readonly arweave: Arweave,
    readonly definitionLoader: DefinitionLoader,
    readonly interactionsLoader: InteractionsLoader,
    readonly executorFactory: ExecutorFactory<HandlerApi<unknown>>,
    readonly stateEvaluator: StateEvaluator,
    readonly environment: WarpEnvironment = 'custom'
  ) {
    this.testing = new Testing(arweave);
    this.kvStorageFactory = (contractTxId: string) => {
      return new LevelDbCache({
        inMemory: false,
        dbLocation: `${DEFAULT_LEVEL_DB_LOCATION}/kv/ldb/${contractTxId}`
      });
    };
  }

  static builder(
    arweave: Arweave,
    stateCache: BasicSortKeyCache<EvalStateResult<unknown>>,
    environment: WarpEnvironment
  ): WarpBuilder {
    return new WarpBuilder(arweave, stateCache, environment);
  }

  /**
   * Allows to connect to any contract using its transaction id.
   * @param contractTxId
   * @param callingContract
   */
  contract<State>(contractTxId: string, callingContract?: Contract, innerCallData?: InnerCallData): Contract<State> {
    return new HandlerBasedContract<State>(contractTxId, this, callingContract, innerCallData);
  }

  async deploy(contractData: ContractData, disableBundling?: boolean): Promise<ContractDeploy> {
    return await this.createContract.deploy(contractData, disableBundling);
  }

  async deployFromSourceTx(contractData: FromSrcTxContractData, disableBundling?: boolean): Promise<ContractDeploy> {
    return await this.createContract.deployFromSourceTx(contractData, disableBundling);
  }

  async deployBundled(rawDataItem: Buffer): Promise<ContractDeploy> {
    return await this.createContract.deployBundled(rawDataItem);
  }

  async register(id: string, bundlrNode: BundlrNodeType): Promise<ContractDeploy> {
    return await this.createContract.register(id, bundlrNode);
  }

  async createSource(
    sourceData: SourceData,
    wallet: ArWallet | CustomSignature | Signer,
    disableBundling = false
  ): Promise<Transaction | DataItem> {
    return await this.createContract.createSource(sourceData, wallet, disableBundling);
  }

  async saveSource(src: Transaction | DataItem, disableBundling?: boolean): Promise<string> {
    return await this.createContract.saveSource(src, disableBundling);
  }

  /**
   * Allows to connect to a contract that conforms to the Profit Sharing Token standard
   * @param contractTxId
   */
  pst(contractTxId: string): PstContract {
    return new PstContractImpl(contractTxId, this);
  }

  useStateCache(stateCache: BasicSortKeyCache<EvalStateResult<unknown>>): Warp {
    this.stateEvaluator.setCache(stateCache);
    return this;
  }

  useContractCache(definition: BasicSortKeyCache<ContractDefinition<unknown>>, src: SortKeyCache<SrcCache>): Warp {
    this.definitionLoader.setSrcCache(src);
    this.definitionLoader.setCache(definition);
    return this;
  }

  use(plugin: WarpPlugin<unknown, unknown>): Warp {
    const pluginType = plugin.type();
    if (!this.isPluginType(pluginType)) {
      throw new Error(`Unknown plugin type ${pluginType}.`);
    }
    this.plugins.set(pluginType, plugin);
    return this;
  }

  hasPlugin(type: WarpPluginType): boolean {
    return this.plugins.has(type);
  }

  matchPlugins(type: string): WarpPluginType[] {
    const pluginTypes = [...this.plugins.keys()];
    return pluginTypes.filter((p) => p.match(type));
  }

  loadPlugin<P, Q>(type: WarpPluginType): WarpPlugin<P, Q> {
    if (!this.hasPlugin(type)) {
      throw new Error(`Plugin ${type} not registered.`);
    }

    return this.plugins.get(type) as WarpPlugin<P, Q>;
  }

  maybeLoadPlugin<P, Q>(type: WarpPluginType): WarpPlugin<P, Q> | null {
    if (!this.hasPlugin(type)) {
      return null;
    }

    return this.plugins.get(type) as WarpPlugin<P, Q>;
  }

  // Close cache connection
  async close(): Promise<void> {
    return Promise.all([
      this.definitionLoader.getSrcCache().close(),
      this.definitionLoader.getCache().close(),
      this.stateEvaluator.getCache().close()
    ]).then();
  }

  async generateWallet(): Promise<Wallet> {
    const wallet = await this.arweave.wallets.generate();

    if (await this.testing.isArlocal()) {
      await this.testing.addFunds(wallet);
    }

    return {
      jwk: wallet,
      address: await this.arweave.wallets.jwkToAddress(wallet)
    };
  }

  private isPluginType(value: string): value is WarpPluginType {
    return (
      knownWarpPlugins.includes(value as WarpKnownPluginType) || knownWarpPluginsPartial.some((p) => value.match(p))
    );
  }

  useKVStorageFactory(factory: KVStorageFactory): Warp {
    this.kvStorageFactory = factory;
    return this;
  }

  useGwUrl(url: string): Warp {
    this._gwUrl = url;
    return this;
  }

  gwUrl(): string {
    return this._gwUrl;
  }
}

export interface WarpAware {
  set warp(warp: Warp);
}
