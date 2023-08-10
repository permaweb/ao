/**
 * Holds all the info we need about an interaction Tx.
 */
export interface InteractionTx {
    id: string;
    recipient: string;
    owner: Owner;
    tags: Record<string, string | string[]>;
    fee: Amount;
    quantity: Amount;
    block: Block;
}
interface Block {
    height: number;
    id: string;
    timestamp: number;
}
interface Owner {
    address: string;
}
interface Amount {
    winston: string;
}
export {};
