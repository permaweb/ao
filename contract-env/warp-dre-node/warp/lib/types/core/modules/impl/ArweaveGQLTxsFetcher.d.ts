import { GQLEdgeInterface, GQLTransaction } from 'legacy/gqlResult';
import { Warp } from '../../Warp';
interface TagFilter {
    name: string;
    values: string[];
}
interface BlockFilter {
    min?: number;
    max?: number;
}
export interface ArweaveTransactionQuery {
    tags?: TagFilter[];
    blockFilter?: BlockFilter;
    first?: number;
    after?: string;
}
/**
 * Query all transactions from arweave gateway
 */
export declare class ArweaveGQLTxsFetcher {
    protected readonly warp: Warp;
    private readonly arweaveWrapper;
    private readonly logger;
    constructor(warp: Warp);
    transaction(transactionId: string): Promise<GQLTransaction>;
    transactions(variables: ArweaveTransactionQuery): Promise<GQLEdgeInterface[]>;
    private fetch;
}
export {};
//# sourceMappingURL=ArweaveGQLTxsFetcher.d.ts.map