import Arweave from 'arweave';
import { SortKeyCacheResult } from '../../../cache/SortKeyCache';
import { ExecutionContext } from '../../ExecutionContext';
import { ExecutionContextModifier } from '../../ExecutionContextModifier';
import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { EvalStateResult, StateEvaluator } from '../StateEvaluator';
import { HandlerApi } from './HandlerExecutorFactory';
import { BasicSortKeyCache } from '../../../cache/BasicSortKeyCache';
/**
 * This class contains the base functionality of evaluating the contracts state - according
 * to the SmartWeave protocol.
 * Marked as abstract - as without help of any cache - the evaluation in real-life applications
 * would be really slow - so using this class without any caching ({@link CacheableStateEvaluator})
 * mechanism built on top makes no sense.
 */
export declare abstract class DefaultStateEvaluator implements StateEvaluator {
    protected readonly arweave: Arweave;
    private readonly executionContextModifiers;
    private readonly logger;
    private readonly tagsParser;
    protected constructor(arweave: Arweave, executionContextModifiers?: ExecutionContextModifier[]);
    eval<State>(executionContext: ExecutionContext<State, HandlerApi<State>>): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    protected doReadState<State>(missingInteractions: GQLNodeInterface[], baseState: EvalStateResult<State>, executionContext: ExecutionContext<State, HandlerApi<State>>): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    private logResult;
    private parseInput;
    abstract latestAvailableState<State>(contractTxId: string, sortKey?: string): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;
    abstract onContractCall<State>(transaction: GQLNodeInterface, executionContext: ExecutionContext<State>, state: EvalStateResult<State>): Promise<void>;
    abstract onInternalWriteStateUpdate<State>(transaction: GQLNodeInterface, contractTxId: string, state: EvalStateResult<State>): Promise<void>;
    abstract onStateEvaluated<State>(transaction: GQLNodeInterface, executionContext: ExecutionContext<State>, state: EvalStateResult<State>): Promise<void>;
    abstract onStateUpdate<State>(transaction: GQLNodeInterface, executionContext: ExecutionContext<State>, state: EvalStateResult<State>, force?: boolean): Promise<void>;
    abstract putInCache<State>(contractTxId: string, transaction: GQLNodeInterface, state: EvalStateResult<State>): Promise<void>;
    abstract syncState<State>(contractTxId: string, sortKey: string, state: State, validity: Record<string, boolean>): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    abstract dumpCache(): Promise<any>;
    abstract internalWriteState<State>(contractTxId: string, sortKey: string): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;
    abstract hasContractCached(contractTxId: string): Promise<boolean>;
    abstract lastCachedSortKey(): Promise<string | null>;
    abstract setCache(cache: BasicSortKeyCache<EvalStateResult<unknown>>): void;
    abstract getCache(): BasicSortKeyCache<EvalStateResult<unknown>>;
}
//# sourceMappingURL=DefaultStateEvaluator.d.ts.map