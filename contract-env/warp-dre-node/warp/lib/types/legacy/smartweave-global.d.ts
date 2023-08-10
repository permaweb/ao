import Arweave from 'arweave';
import { EvaluationOptions } from '../core/modules/StateEvaluator';
import { GQLNodeInterface, GQLTagInterface, VrfData } from './gqlResult';
import { SortKeyCache } from '../cache/SortKeyCache';
import { SortKeyCacheRangeOptions } from '../cache/SortKeyCacheRangeOptions';
import { InteractionState } from '../contract/states/InteractionState';
/**
 *
 * This class is exposed as a global for contracts
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
export type TransactionOrigin = 'L1' | 'L2';
export declare class SmartWeaveGlobal {
    gasUsed: number;
    gasLimit: number;
    transaction: SWTransaction;
    block: SWBlock;
    vrf: SWVrf;
    evaluationOptions: EvaluationOptions;
    arweave: Pick<Arweave, 'ar' | 'wallets' | 'utils' | 'crypto'>;
    contract: {
        id: string;
        owner: string;
    };
    unsafeClient: Arweave;
    contracts: {
        readContractState: (contractId: string) => Promise<any>;
        viewContractState: (contractId: string, input: any) => Promise<any>;
        write: (contractId: string, input: any) => Promise<any>;
        refreshState: () => Promise<any>;
    };
    extensions: any;
    _activeTx?: GQLNodeInterface;
    caller?: string;
    kv: KV;
    constructor(arweave: Arweave, contract: {
        id: string;
        owner: string;
    }, evaluationOptions: EvaluationOptions, interactionState: InteractionState, storage: SortKeyCache<any> | null);
    useGas(gas: number): void;
    getBalance(address: string, height?: number): Promise<string>;
}
export declare class SWTransaction {
    private readonly smartWeaveGlobal;
    constructor(smartWeaveGlobal: SmartWeaveGlobal);
    get id(): string;
    get owner(): string;
    get target(): string;
    get tags(): GQLTagInterface[];
    get sortKey(): string;
    get dryRun(): boolean;
    get quantity(): string;
    get reward(): string;
    get origin(): TransactionOrigin;
}
export declare class SWBlock {
    private readonly smartWeaveGlobal;
    constructor(smartWeaveGlobal: SmartWeaveGlobal);
    get height(): number;
    get indep_hash(): string;
    get timestamp(): number;
}
export declare class SWVrf {
    private readonly smartWeaveGlobal;
    constructor(smartWeaveGlobal: SmartWeaveGlobal);
    get data(): VrfData;
    get value(): string;
    randomInt(maxValue: number): number;
}
export declare class KV {
    private readonly _storage;
    private readonly _interactionState;
    private readonly _transaction;
    private readonly _contractTxId;
    constructor(_storage: SortKeyCache<any> | null, _interactionState: InteractionState, _transaction: SWTransaction, _contractTxId: string);
    put(key: string, value: any): Promise<void>;
    get(key: string): Promise<unknown | null>;
    del(key: string): Promise<void>;
    keys(options?: SortKeyCacheRangeOptions): Promise<string[]>;
    kvMap<V>(options?: SortKeyCacheRangeOptions): Promise<Map<string, V>>;
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    open(): Promise<void>;
    close(): Promise<void>;
    private checkStorageAvailable;
}
//# sourceMappingURL=smartweave-global.d.ts.map