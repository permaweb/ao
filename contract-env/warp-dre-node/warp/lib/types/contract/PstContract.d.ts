import { Contract, EvolveState, WriteInteractionOptions, WriteInteractionResponse } from './Contract';
/**
 * The result from the "balance" view method on the PST Contract.
 */
export interface BalanceResult {
    target: string;
    ticker: string;
    balance: number;
}
/**
 * Interface describing base state for all PST contracts.
 */
export interface PstState extends EvolveState {
    ticker: string;
    owner: string;
    balances: {
        [key: string]: number;
    };
}
/**
 * Interface describing data required for making a transfer
 */
export interface TransferInput {
    target: string;
    qty: number;
}
/**
 * A type of {@link Contract} designed specifically for the interaction with
 * Profit Sharing Token contract.
 */
export interface PstContract extends Contract<PstState> {
    /**
     * return the current balance for the given wallet
     * @param target - wallet address
     */
    currentBalance(target: string): Promise<BalanceResult>;
    /**
     * returns the current contract state
     */
    currentState(): Promise<PstState>;
    /**
     * allows to transfer PSTs between wallets
     * @param transfer - data required to perform a transfer, see {@link transfer}
     */
    transfer(transfer: TransferInput, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null>;
}
//# sourceMappingURL=PstContract.d.ts.map