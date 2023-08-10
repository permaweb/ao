import { SortKeyCacheResult } from '../../cache/SortKeyCache';
import { ExecutionContext } from '../ExecutionContext';
import { GQLNodeInterface } from '../../legacy/gqlResult';
import { SourceType } from './impl/WarpGatewayInteractionsLoader';
import { BasicSortKeyCache } from '../../cache/BasicSortKeyCache';
/**
 * Implementors of this class are responsible for evaluating contract's state
 * - based on the {@link ExecutionContext}.
 */
export interface StateEvaluator {
    eval<State>(executionContext: ExecutionContext<State>): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    /**
     * a hook that is called on each state update (i.e. after evaluating state for each interaction transaction)
     */
    onStateUpdate<State>(transaction: GQLNodeInterface, executionContext: ExecutionContext<State>, state: EvalStateResult<State>, force?: boolean): Promise<void>;
    /**
     * a hook that is called after state has been fully evaluated
     */
    onStateEvaluated<State>(transaction: GQLNodeInterface, executionContext: ExecutionContext<State>, state: EvalStateResult<State>): Promise<void>;
    /**
     * a hook that is called after performing internal write between contracts
     */
    onInternalWriteStateUpdate<State>(transaction: GQLNodeInterface, contractTxId: string, state: EvalStateResult<State>): Promise<void>;
    /**
     * a hook that is called before communicating with other contract.
     * note to myself: putting values into cache only "onContractCall" may degrade performance.
     * For example:
     * 1. block 722317 - contract A calls B
     * 2. block 722727 - contract A calls B
     * 3. block 722695 - contract B calls A
     * If we update cache only on contract call - for the last above call (B->A)
     * we would retrieve state cached for 722317. If there are any transactions
     * between 722317 and 722695 - the performance will be degraded.
     */
    onContractCall<State>(transaction: GQLNodeInterface, executionContext: ExecutionContext<State>, state: EvalStateResult<State>): Promise<void>;
    /**
     * loads the latest available state for given contract for given sortKey.
     */
    latestAvailableState<State>(contractTxId: string, sortKey?: string): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;
    putInCache<State>(contractTxId: string, transaction: GQLNodeInterface, state: EvalStateResult<State>): Promise<void>;
    /**
     * allows to syncState with an external state source (like Warp Distributed Execution Network)
     */
    syncState<State>(contractTxId: string, sortKey: string, state: State, validity: Record<string, boolean>): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    internalWriteState<State>(contractTxId: string, sortKey: string): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;
    dumpCache(): Promise<any>;
    hasContractCached(contractTxId: string): Promise<boolean>;
    lastCachedSortKey(): Promise<string | null>;
    setCache(cache: BasicSortKeyCache<EvalStateResult<unknown>>): void;
    getCache(): BasicSortKeyCache<EvalStateResult<unknown>>;
}
export declare class EvalStateResult<State> {
    readonly state: State;
    readonly validity: Record<string, boolean>;
    readonly errorMessages: Record<string, string>;
    readonly result?: any;
    constructor(state: State, validity: Record<string, boolean>, errorMessages: Record<string, string>, result?: any);
}
export type UnsafeClientOptions = 'allow' | 'skip' | 'throw';
export declare class DefaultEvaluationOptions implements EvaluationOptions {
    ignoreExceptions: boolean;
    waitForConfirmation: boolean;
    updateCacheForEachInteraction: boolean;
    internalWrites: boolean;
    maxCallDepth: number;
    maxInteractionEvaluationTimeSeconds: number;
    stackTrace: {
        saveState: boolean;
    };
    sequencerUrl: string;
    gasLimit: number;
    sourceType: SourceType;
    unsafeClient: "throw";
    allowBigInt: boolean;
    walletBalanceUrl: string;
    mineArLocalBlocks: boolean;
    throwOnInternalWriteError: boolean;
    cacheEveryNInteractions: number;
    useKVStorage: boolean;
    remoteStateSyncEnabled: boolean;
    remoteStateSyncSource: string;
    useConstructor: boolean;
}
export interface EvaluationOptions {
    ignoreExceptions: boolean;
    waitForConfirmation: boolean;
    updateCacheForEachInteraction: boolean;
    internalWrites: boolean;
    maxCallDepth: number;
    maxInteractionEvaluationTimeSeconds: number;
    stackTrace: {
        saveState: boolean;
    };
    sequencerUrl: string;
    gasLimit: number;
    unsafeClient: UnsafeClientOptions;
    allowBigInt: boolean;
    walletBalanceUrl: string;
    sourceType: SourceType;
    mineArLocalBlocks: boolean;
    throwOnInternalWriteError: boolean;
    cacheEveryNInteractions: number;
    useKVStorage: boolean;
    useConstructor: boolean;
    remoteStateSyncEnabled: boolean;
    remoteStateSyncSource: string;
}
//# sourceMappingURL=StateEvaluator.d.ts.map