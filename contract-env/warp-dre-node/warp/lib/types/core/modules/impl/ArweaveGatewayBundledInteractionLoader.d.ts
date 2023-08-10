import Arweave from 'arweave';
import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { GW_TYPE, InteractionsLoader } from '../InteractionsLoader';
import { EvaluationOptions } from '../StateEvaluator';
import { Warp, WarpEnvironment } from '../../Warp';
interface TagFilter {
    name: string;
    values: string[];
}
interface BlockFilter {
    min?: number;
    max?: number;
}
export interface GqlReqVariables {
    tags: TagFilter[];
    blockFilter: BlockFilter;
    first: number;
    after?: string;
}
export declare class ArweaveGatewayBundledInteractionLoader implements InteractionsLoader {
    protected readonly arweave: Arweave;
    private readonly environment;
    private readonly logger;
    private arweaveFetcher;
    private arweaveWrapper;
    private _warp;
    private readonly sorter;
    private readonly tagsParser;
    constructor(arweave: Arweave, environment: WarpEnvironment);
    load(contractId: string, fromSortKey?: string, toSortKey?: string, evaluationOptions?: EvaluationOptions): Promise<GQLNodeInterface[]>;
    private verifySortKeyIntegrity;
    private isSortKeyInBounds;
    private attachSequencerDataToInteraction;
    private appendInternalWriteInteractions;
    private maybeAddMockVrf;
    private isNewerThenSortKeyBlockHeight;
    private currentBlockHeight;
    type(): GW_TYPE;
    clearCache(): void;
    set warp(warp: Warp);
}
export {};
//# sourceMappingURL=ArweaveGatewayBundledInteractionLoader.d.ts.map