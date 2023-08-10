import Arweave from 'arweave';
import { ContractDefinition } from '../../ContractDefinition';
import { ExecutionContext } from '../../ExecutionContext';
import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { SmartWeaveGlobal } from '../../../legacy/smartweave-global';
import { ExecutorFactory } from '../ExecutorFactory';
import { EvalStateResult, EvaluationOptions } from '../StateEvaluator';
import { Warp } from '../../Warp';
import { InteractionState } from '../../../contract/states/InteractionState';
import { WarpLogger } from '../../../logging/WarpLogger';
export declare class ContractError<T> extends Error {
    readonly error: T;
    readonly subtype?: string;
    constructor(error: T, subtype?: string);
}
/**
 * A factory that produces handlers that are compatible with the "current" style of
 * writing SW contracts (i.e. using "handle" function).
 */
export declare class HandlerExecutorFactory implements ExecutorFactory<HandlerApi<unknown>> {
    private readonly arweave;
    private readonly logger;
    constructor(arweave: Arweave);
    create<State>(contractDefinition: ContractDefinition<State>, evaluationOptions: EvaluationOptions, warp: Warp, interactionState: InteractionState): Promise<HandlerApi<State>>;
}
export interface InteractionData<Input> {
    interaction: ContractInteraction<Input>;
    interactionTx: GQLNodeInterface;
}
/**
 * A handle that effectively runs contract's code.
 */
export interface HandlerApi<State> {
    handle<Input, Result>(executionContext: ExecutionContext<State>, currentResult: EvalStateResult<State>, interactionData: InteractionData<Input>): Promise<InteractionResult<State, Result>>;
    initState(state: State): void;
    maybeCallStateConstructor(initialState: State, executionContext: ExecutionContext<State>): Promise<State>;
}
export type HandlerFunction<State, Input, Result> = (state: State, interaction: ContractInteraction<Input>) => Promise<HandlerResult<State, Result>>;
export type HandlerResult<State, Result> = {
    result: Result;
    state: State;
    gasUsed?: number;
};
export type InteractionResult<State, Result> = HandlerResult<State, Result> & {
    type: InteractionResultType;
    errorMessage?: string;
    error?: unknown;
    originalValidity?: Record<string, boolean>;
    originalErrorMessages?: Record<string, string>;
};
export type InteractionType = 'view' | 'write';
export type ContractInteraction<Input> = {
    input: Input;
    caller: string;
    interactionType: InteractionType;
};
export type InteractionResultType = 'ok' | 'error' | 'exception';
export interface IvmOptions {
    memoryLimit?: number;
    timeout?: number;
}
export interface IvmPluginInput {
    contractSource: string;
    evaluationOptions: EvaluationOptions;
    arweave: Arweave;
    swGlobal: SmartWeaveGlobal;
    contractDefinition: ContractDefinition<unknown>;
}
export interface VM2PluginInput {
    normalizedSource: string;
    swGlobal: SmartWeaveGlobal;
    logger: WarpLogger;
    contractDefinition: ContractDefinition<unknown>;
}
//# sourceMappingURL=HandlerExecutorFactory.d.ts.map