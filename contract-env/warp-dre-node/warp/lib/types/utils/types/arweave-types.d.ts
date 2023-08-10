export interface TransactionConfirmedData {
    block_indep_hash: string;
    block_height: number;
    number_of_confirmations: number;
}
export interface TransactionStatusResponse {
    status: number;
    confirmed: TransactionConfirmedData | null;
}
export interface TransactionInterface {
    format: number;
    id: string;
    last_tx: string;
    owner: string;
    tags: Tag[];
    target: string;
    quantity: string;
    data: Uint8Array;
    reward: string;
    signature: string;
    data_size: string;
    data_root: string;
}
export interface Chunk {
    dataHash: Uint8Array;
    minByteRange: number;
    maxByteRange: number;
}
export interface Proof {
    offset: number;
    proof: Uint8Array;
}
declare class BaseObject {
    [key: string]: any;
    get(field: string): string;
    get(field: string, options: {
        decode: true;
        string: false;
    }): Uint8Array;
    get(field: string, options: {
        decode: true;
        string: true;
    }): string;
}
export declare class Transaction extends BaseObject implements TransactionInterface {
    readonly format: number;
    id: string;
    readonly last_tx: string;
    owner: string;
    tags: Tag[];
    readonly target: string;
    readonly quantity: string;
    readonly data_size: string;
    data: Uint8Array;
    data_root: string;
    reward: string;
    signature: string;
    chunks?: {
        data_root: Uint8Array;
        chunks: Chunk[];
        proofs: Proof[];
    };
    constructor(attributes?: Partial<TransactionInterface>);
    addTag(name: string, value: string): void;
    toJSON(): {
        format: number;
        id: string;
        last_tx: string;
        owner: string;
        tags: Tag[];
        target: string;
        quantity: string;
        data: string;
        data_size: string;
        data_root: string;
        data_tree: any;
        reward: string;
        signature: string;
    };
    setOwner(owner: string): void;
    setSignature({ id, owner, reward, tags, signature }: {
        id: string;
        owner: string;
        reward?: string;
        tags?: Tag[];
        signature: string;
    }): void;
    prepareChunks(data: Uint8Array): Promise<void>;
    getChunk(idx: number, data: Uint8Array): {
        data_root: string;
        data_size: string;
        data_path: string;
        offset: string;
        chunk: string;
    };
    getSignatureData(): Promise<Uint8Array>;
}
export declare class Tag extends BaseObject {
    readonly name: string;
    readonly value: string;
    constructor(name: string, value: string, decode?: boolean);
}
export interface JWKPublicInterface {
    kty: string;
    e: string;
    n: string;
}
export interface JWKInterface extends JWKPublicInterface {
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
}
export interface CreateTransactionInterface {
    format: number;
    last_tx: string;
    owner: string;
    tags: Tag[];
    target: string;
    quantity: string;
    data: string | Uint8Array | ArrayBuffer;
    data_size: string;
    data_root: string;
    reward: string;
}
export interface BlockData {
    nonce: string;
    previous_block: string;
    timestamp: number;
    last_retarget: number;
    diff: string;
    height: number;
    hash: string;
    indep_hash: string;
    txs: string[];
    tx_root: string;
    wallet_list: string;
    reward_addr: string;
    tags: Tag[];
    reward_pool: number;
    weave_size: number;
    block_size: number;
    cumulative_diff: string;
    hash_list_merkle: string;
}
export interface NetworkInfoInterface {
    network: string;
    version: number;
    release: number;
    height: number;
    current: string;
    blocks: number;
    peers: number;
    queue_length: number;
    node_state_latency: number;
}
export {};
//# sourceMappingURL=arweave-types.d.ts.map