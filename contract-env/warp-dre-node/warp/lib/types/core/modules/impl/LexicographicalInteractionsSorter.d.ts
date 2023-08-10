import Arweave from 'arweave';
import { GQLEdgeInterface } from '../../../legacy/gqlResult';
import { InteractionsSorter } from '../InteractionsSorter';
export declare const defaultArweaveMs: string;
export declare const sortingFirst: string;
export declare const sortingLast: string;
export declare const genesisSortKey: string;
export declare const lastPossibleSortKey: string;
/**
 * implementation that is based on current's SDK sorting alg.
 */
export declare class LexicographicalInteractionsSorter implements InteractionsSorter {
    private readonly arweave;
    private readonly logger;
    constructor(arweave: Arweave);
    sort(transactions: GQLEdgeInterface[]): Promise<GQLEdgeInterface[]>;
    createSortKey(blockId: string, transactionId: string, blockHeight: number, dummy?: boolean): Promise<string>;
    extractBlockHeight(sortKey?: string): number | null;
    private addSortKey;
    generateLastSortKey(blockHeight: number): string;
}
//# sourceMappingURL=LexicographicalInteractionsSorter.d.ts.map