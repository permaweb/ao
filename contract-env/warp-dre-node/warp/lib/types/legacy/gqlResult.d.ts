export interface GQLPageInfoInterface {
    hasNextPage: boolean;
}
export interface GQLOwnerInterface {
    address: string;
    key: string;
}
export interface GQLAmountInterface {
    winston: string;
    ar: string;
}
export interface GQLMetaDataInterface {
    size: number;
    type: string;
}
export interface GQLTagInterface {
    name: string;
    value: string;
}
export interface GQLBlockInterface {
    id: string;
    timestamp: number;
    height: number;
    previous: string;
}
type LastSortKey = 'null' | string;
export interface GQLNodeInterface {
    id: string;
    anchor: string;
    signature: string;
    recipient: string;
    owner: GQLOwnerInterface;
    fee: GQLAmountInterface;
    quantity: GQLAmountInterface;
    data: GQLMetaDataInterface;
    tags: GQLTagInterface[];
    block: GQLBlockInterface;
    parent: {
        id: string;
    };
    bundledIn: {
        id: string;
    };
    dry?: boolean;
    sortKey?: string;
    lastSortKey?: LastSortKey;
    strict?: boolean;
    confirmationStatus?: string;
    source?: string;
    bundlerTxId?: string;
    vrf?: VrfData;
}
export interface VrfData {
    index: string;
    proof: string;
    bigint: string;
    pubkey: string;
}
export interface GQLEdgeInterface {
    cursor: string;
    node: GQLNodeInterface;
}
export interface GQLTransactionsResultInterface {
    pageInfo: GQLPageInfoInterface;
    edges: GQLEdgeInterface[];
}
export interface GQLResultInterface {
    data: {
        transactions: GQLTransactionsResultInterface;
    };
}
export interface GQLTransaction {
    id: string;
    owner: GQLOwnerInterface;
    recipient: string;
    tags: GQLTagInterface[];
    block: GQLBlockInterface;
    fee: GQLAmountInterface;
    quantity: GQLAmountInterface;
    bundledIn: {
        id: string;
    };
    parent: {
        id: string;
    };
    signature: string;
}
export interface GQLTransactionResponse {
    transaction: GQLTransaction;
}
export {};
//# sourceMappingURL=gqlResult.d.ts.map