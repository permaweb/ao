import Arweave from 'arweave';
import { ContractDefinition, ContractSource, ContractCache, SrcCache } from '../../ContractDefinition';
import { ArweaveWrapper } from '../../../utils/ArweaveWrapper';
import { DefinitionLoader } from '../DefinitionLoader';
import { GW_TYPE } from '../InteractionsLoader';
import { Warp, WarpEnvironment } from '../../Warp';
import { BasicSortKeyCache } from '../../../cache/BasicSortKeyCache';
export declare class ContractDefinitionLoader implements DefinitionLoader {
    private readonly arweave;
    private readonly env;
    private readonly logger;
    protected arweaveWrapper: ArweaveWrapper;
    private readonly tagsParser;
    constructor(arweave: Arweave, env: WarpEnvironment);
    load<State>(contractTxId: string, evolvedSrcTxId?: string): Promise<ContractDefinition<State>>;
    doLoad<State>(contractTxId: string, forcedSrcTxId?: string): Promise<ContractDefinition<State>>;
    loadContractSource(contractSrcTxId: string): Promise<ContractSource>;
    private evalInitialState;
    type(): GW_TYPE;
    setCache(cache: BasicSortKeyCache<ContractDefinition<unknown>>): void;
    setSrcCache(cache: BasicSortKeyCache<SrcCache>): void;
    getCache(): BasicSortKeyCache<ContractCache<unknown>>;
    getSrcCache(): BasicSortKeyCache<SrcCache>;
    set warp(warp: Warp);
}
//# sourceMappingURL=ContractDefinitionLoader.d.ts.map