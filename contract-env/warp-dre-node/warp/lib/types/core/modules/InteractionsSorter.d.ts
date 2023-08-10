import { GQLEdgeInterface } from '../../legacy/gqlResult';
/**
 * this is probably self-explanatory ;-)
 */
export interface InteractionsSorter {
    sort(transactions: GQLEdgeInterface[]): Promise<GQLEdgeInterface[]>;
    /**
     * generates a sort key according to protocol specs
     */
    createSortKey(blockId: string, transactionId: string, blockHeight: number, dummy?: boolean): Promise<string>;
    /**
     * retreives the block height from the sort key
     */
    extractBlockHeight(sortKey?: string): number | null;
    /**
     * generates a sort key for given block height - with a guarantee,
     * that it will the last possible sort key for a given block height
     */
    generateLastSortKey(blockHeight: number): string;
}
//# sourceMappingURL=InteractionsSorter.d.ts.map