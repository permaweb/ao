import { SortKeyCacheResult } from '../cache/SortKeyCache';
import { ContractCallRecord } from '../core/ContractCallRecord';
import { InteractionResult } from '../core/modules/impl/HandlerExecutorFactory';
import { EvalStateResult, EvaluationOptions } from '../core/modules/StateEvaluator';
import { Warp } from '../core/Warp';
import { GQLNodeInterface } from '../legacy/gqlResult';
import { BenchmarkStats, Contract, DREContractStatusResponse, InnerCallData, WriteInteractionOptions, WriteInteractionResponse } from './Contract';
import { ArTransfer, ArWallet, Tags } from './deploy/CreateContract';
import { CustomSignature } from './Signature';
import { EvaluationOptionsEvaluator } from './EvaluationOptionsEvaluator';
import { InteractionState } from './states/InteractionState';
import { Signer } from 'warp-arbundles';
/**
 * An implementation of {@link Contract} that is backwards compatible with current style
 * of writing SW contracts (ie. using the "handle" function).
 *
 * It requires {@link ExecutorFactory} that is using {@link HandlerApi} generic type.
 */
export declare class HandlerBasedContract<State> implements Contract<State> {
    private readonly _contractTxId;
    protected readonly warp: Warp;
    private readonly _parentContract;
    private readonly _innerCallData;
    private readonly logger;
    private readonly ecLogger;
    private readonly _innerWritesEvaluator;
    private readonly _callDepth;
    private readonly _arweaveWrapper;
    private readonly _mutex;
    private _callStack;
    private _evaluationOptions;
    private _eoEvaluator;
    private _benchmarkStats;
    private _sorter;
    private _rootSortKey;
    private _signature;
    private _warpFetchWrapper;
    private _children;
    private _interactionState;
    private _dreStates;
    constructor(_contractTxId: string, warp: Warp, _parentContract?: Contract, _innerCallData?: InnerCallData);
    readState(sortKeyOrBlockHeight?: string | number, caller?: string, interactions?: GQLNodeInterface[]): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    readStateFor(sortKey: string, interactions: GQLNodeInterface[]): Promise<SortKeyCacheResult<EvalStateResult<State>>>;
    viewState<Input, View>(input: Input, tags?: Tags, transfer?: ArTransfer, caller?: string): Promise<InteractionResult<State, View>>;
    viewStateForTx<Input, View>(input: Input, interactionTx: GQLNodeInterface): Promise<InteractionResult<State, View>>;
    dryWrite<Input>(input: Input, caller?: string, tags?: Tags, transfer?: ArTransfer, vrf?: boolean): Promise<InteractionResult<State, unknown>>;
    applyInput<Input>(input: Input, transaction: GQLNodeInterface): Promise<InteractionResult<State, unknown>>;
    writeInteraction<Input>(input: Input, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null>;
    private bundleInteraction;
    private createInteractionDataItem;
    private createInteraction;
    private checkInteractionInStrictMode;
    txId(): string;
    getCallStack(): ContractCallRecord;
    connect(signature: ArWallet | CustomSignature | Signer): Contract<State>;
    setEvaluationOptions(options: Partial<EvaluationOptions>): Contract<State>;
    private waitForConfirmation;
    private createExecutionContext;
    private resolveEvaluationOptions;
    private getRemoteContractState;
    private fetchRemoteContractState;
    private getToSortKey;
    private createExecutionContextFromTx;
    private maybeResetRootContract;
    private callContract;
    private doApplyInputOnTx;
    private evalInteraction;
    parent(): Contract | null;
    callDepth(): number;
    evaluationOptions(): EvaluationOptions;
    lastReadStateStats(): BenchmarkStats;
    stateHash(state: State): Promise<string>;
    syncState(externalUrl: string, params?: any): Promise<Contract>;
    evolve(newSrcTxId: string, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null>;
    get rootSortKey(): string;
    getRootEoEvaluator(): EvaluationOptionsEvaluator;
    isRoot(): boolean;
    getStorageValues(keys: string[]): Promise<SortKeyCacheResult<Map<string, unknown>>>;
    interactionState(): InteractionState;
    getRoot(): HandlerBasedContract<unknown>;
    private maybeSyncStateWithRemoteSource;
    private isStateHigherThanAndUpTo;
    setDREState(contractTxId: string, result: DREContractStatusResponse<State>): SortKeyCacheResult<EvalStateResult<State>>;
    getDreState(contractTxId: string): SortKeyCacheResult<EvalStateResult<State>>;
    hasDreState(contractTxId: string): boolean;
    private discoverInternalWrites;
}
//# sourceMappingURL=HandlerBasedContract.d.ts.map