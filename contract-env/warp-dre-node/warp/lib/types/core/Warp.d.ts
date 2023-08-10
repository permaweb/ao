/// <reference types="node" />
import Arweave from 'arweave';
import { Contract, InnerCallData } from '../contract/Contract';
import { ArWallet, BundlrNodeType, ContractData, ContractDeploy, FromSrcTxContractData } from '../contract/deploy/CreateContract';
import { PstContract } from '../contract/PstContract';
import { Testing, Wallet } from '../contract/testing/Testing';
import { DefinitionLoader } from './modules/DefinitionLoader';
import { ExecutorFactory } from './modules/ExecutorFactory';
import { HandlerApi } from './modules/impl/HandlerExecutorFactory';
import { InteractionsLoader } from './modules/InteractionsLoader';
import { EvalStateResult, StateEvaluator } from './modules/StateEvaluator';
import { WarpBuilder } from './WarpBuilder';
import { WarpPluginType, WarpPlugin } from './WarpPlugin';
import { SortKeyCache } from '../cache/SortKeyCache';
import { ContractDefinition, SrcCache } from './ContractDefinition';
import { CustomSignature } from '../contract/Signature';
import { Transaction } from '../utils/types/arweave-types';
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
export declare class Warp {
    readonly arweave: Arweave;
    readonly definitionLoader: DefinitionLoader;
    readonly interactionsLoader: InteractionsLoader;
    readonly executorFactory: ExecutorFactory<HandlerApi<unknown>>;
    readonly stateEvaluator: StateEvaluator;
    readonly environment: WarpEnvironment;
    private _createContract;
    private _gwUrl;
    private get createContract();
    readonly testing: Testing;
    kvStorageFactory: KVStorageFactory;
    whoAmI: string;
    private readonly plugins;
    constructor(arweave: Arweave, definitionLoader: DefinitionLoader, interactionsLoader: InteractionsLoader, executorFactory: ExecutorFactory<HandlerApi<unknown>>, stateEvaluator: StateEvaluator, environment?: WarpEnvironment);
    static builder(arweave: Arweave, stateCache: BasicSortKeyCache<EvalStateResult<unknown>>, environment: WarpEnvironment): WarpBuilder;
    /**
     * Allows to connect to any contract using its transaction id.
     * @param contractTxId
     * @param callingContract
     */
    contract<State>(contractTxId: string, callingContract?: Contract, innerCallData?: InnerCallData): Contract<State>;
    deploy(contractData: ContractData, disableBundling?: boolean): Promise<ContractDeploy>;
    deployFromSourceTx(contractData: FromSrcTxContractData, disableBundling?: boolean): Promise<ContractDeploy>;
    deployBundled(rawDataItem: Buffer): Promise<ContractDeploy>;
    register(id: string, bundlrNode: BundlrNodeType): Promise<ContractDeploy>;
    createSource(sourceData: SourceData, wallet: ArWallet | CustomSignature | Signer, disableBundling?: boolean): Promise<Transaction | DataItem>;
    saveSource(src: Transaction | DataItem, disableBundling?: boolean): Promise<string>;
    /**
     * Allows to connect to a contract that conforms to the Profit Sharing Token standard
     * @param contractTxId
     */
    pst(contractTxId: string): PstContract;
    useStateCache(stateCache: BasicSortKeyCache<EvalStateResult<unknown>>): Warp;
    useContractCache(definition: BasicSortKeyCache<ContractDefinition<unknown>>, src: SortKeyCache<SrcCache>): Warp;
    use(plugin: WarpPlugin<unknown, unknown>): Warp;
    hasPlugin(type: WarpPluginType): boolean;
    matchPlugins(type: string): WarpPluginType[];
    loadPlugin<P, Q>(type: WarpPluginType): WarpPlugin<P, Q>;
    maybeLoadPlugin<P, Q>(type: WarpPluginType): WarpPlugin<P, Q> | null;
    close(): Promise<void>;
    generateWallet(): Promise<Wallet>;
    private isPluginType;
    useKVStorageFactory(factory: KVStorageFactory): Warp;
    useGwUrl(url: string): Warp;
    gwUrl(): string;
}
export interface WarpAware {
    set warp(warp: Warp);
}
//# sourceMappingURL=Warp.d.ts.map