/// <reference types="node" />
import { BlockData, NetworkInfoInterface, Transaction } from './types/arweave-types';
import { Warp } from '../core/Warp';
export declare class ArweaveWrapper {
    private readonly warp;
    private readonly logger;
    private readonly baseUrl;
    constructor(warp: Warp);
    warpGwInfo(): Promise<NetworkInfoInterface>;
    warpGwBlock(): Promise<BlockData>;
    info(): Promise<NetworkInfoInterface>;
    /**
     *
     * @param query graphql query string
     * @param variables variables depends on provided query
     * @returns axios-like (for backwards compatibility..) response from graphql
     */
    gql(query: string, variables: unknown): Promise<{
        data: any;
        status: number;
    }>;
    tx(id: string): Promise<Transaction>;
    txData(id: string): Promise<Buffer>;
    txDataString(id: string): Promise<string>;
    private doFetchInfo;
}
//# sourceMappingURL=ArweaveWrapper.d.ts.map