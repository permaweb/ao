import Arweave from 'arweave';
import { GQLEdgeInterface, GQLNodeInterface } from '../../../legacy/gqlResult';
import { GW_TYPE, InteractionsLoader } from '../InteractionsLoader';
import { EvaluationOptions } from '../StateEvaluator';
import { Warp, WarpEnvironment } from '../../Warp';
export declare function bundledTxsFilter(tx: GQLEdgeInterface): boolean;
export declare class ArweaveGatewayInteractionsLoader implements InteractionsLoader {
    protected readonly arweave: Arweave;
    private readonly environment;
    private readonly logger;
    private readonly sorter;
    private arweaveTransactionQuery;
    private _warp;
    private readonly tagsParser;
    constructor(arweave: Arweave, environment: WarpEnvironment);
    load(contractId: string, fromSortKey?: string, toSortKey?: string, evaluationOptions?: EvaluationOptions): Promise<GQLNodeInterface[]>;
    type(): GW_TYPE;
    clearCache(): void;
    set warp(warp: Warp);
}
//# sourceMappingURL=ArweaveGatewayInteractionsLoader.d.ts.map