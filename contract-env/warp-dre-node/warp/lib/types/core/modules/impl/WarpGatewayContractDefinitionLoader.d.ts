import Arweave from 'arweave';
import { GW_TYPE } from '../InteractionsLoader';
import { ContractCache, ContractDefinition, ContractSource, SrcCache } from '../../ContractDefinition';
import { DefinitionLoader } from '../DefinitionLoader';
import { Warp, WarpEnvironment } from '../../Warp';
import { BasicSortKeyCache } from '../../../cache/BasicSortKeyCache';
/**
 * An extension to {@link ContractDefinitionLoader} that makes use of
 * Warp Gateway ({@link https://github.com/redstone-finance/redstone-sw-gateway})
 * to load Contract Data.
 *
 * If the contract data is not available on Warp Gateway - it fallbacks to default implementation
 * in {@link ContractDefinitionLoader} - i.e. loads the definition from Arweave gateway.
 */
export declare class WarpGatewayContractDefinitionLoader implements DefinitionLoader {
    private definitionCache;
    private srcCache;
    private readonly env;
    private readonly rLogger;
    private contractDefinitionLoader;
    private arweaveWrapper;
    private readonly tagsParser;
    private _warp;
    constructor(arweave: Arweave, definitionCache: BasicSortKeyCache<ContractCache<unknown>>, srcCache: BasicSortKeyCache<SrcCache>, env: WarpEnvironment);
    load<State>(contractTxId: string, evolvedSrcTxId?: string): Promise<ContractDefinition<State>>;
    doLoad<State>(contractTxId: string, forcedSrcTxId?: string): Promise<ContractDefinition<State>>;
    loadContractSource(contractSrcTxId: string): Promise<ContractSource>;
    type(): GW_TYPE;
    setCache(cache: BasicSortKeyCache<ContractCache<unknown>>): void;
    setSrcCache(cacheSrc: BasicSortKeyCache<SrcCache>): void;
    getCache(): BasicSortKeyCache<ContractCache<unknown>>;
    getSrcCache(): BasicSortKeyCache<SrcCache>;
    private verifyEnv;
    private getFromCache;
    private putToCache;
    set warp(warp: Warp);
}
//# sourceMappingURL=WarpGatewayContractDefinitionLoader.d.ts.map