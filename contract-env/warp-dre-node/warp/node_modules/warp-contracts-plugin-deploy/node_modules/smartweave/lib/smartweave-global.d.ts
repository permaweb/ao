import Arweave from 'arweave';
import { InteractionTx } from './interaction-tx';
/**
 *
 * This class is be exposed as a global for contracts
 * as 'SmartWeave' and provides an API for getting further
 * information or using utility and crypto functions from
 * inside the contracts execution.
 *
 * It provides an api:
 *
 * - SmartWeave.transaction.id
 * - SmartWeave.transaction.reward
 * - SmartWeave.block.height
 * - SmartWeave.block.timestamp
 * - etc
 *
 * and access to some of the arweave utils:
 * - SmartWeave.arweave.utils
 * - SmartWeave.arweave.crypto
 * - SmartWeave.arweave.wallets
 * - SmartWeave.arweave.ar
 *
 * as well as access to the potentially non-deterministic full client:
 * - SmartWeave.unsafeClient
 *
 */
export declare class SmartWeaveGlobal {
    transaction: Transaction;
    block: Block;
    arweave: Pick<Arweave, 'ar' | 'wallets' | 'utils' | 'crypto'>;
    contract: {
        id: string;
        owner: string;
    };
    unsafeClient: Arweave;
    contracts: {
        readContractState: (contractId: string) => Promise<any>;
    };
    _activeTx?: InteractionTx;
    get _isDryRunning(): boolean;
    constructor(arweave: Arweave, contract: {
        id: string;
        owner: string;
    });
}
declare class Transaction {
    private readonly global;
    constructor(global: SmartWeaveGlobal);
    get id(): string;
    get owner(): string;
    get target(): string;
    get tags(): Record<string, string | string[]>;
    get quantity(): string;
    get reward(): string;
}
declare class Block {
    private readonly global;
    constructor(global: SmartWeaveGlobal);
    get height(): number;
    get indep_hash(): string;
    get timestamp(): number;
}
export {};
