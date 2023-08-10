import { ContractDefinition } from '../../../ContractDefinition';
import { ExecutionContext } from '../../../ExecutionContext';
import { EvalStateResult } from '../../StateEvaluator';
import { SmartWeaveGlobal } from '../../../../legacy/smartweave-global';
import { InteractionData, InteractionResult } from '../HandlerExecutorFactory';
import { AbstractContractHandler } from './AbstractContractHandler';
export declare class WasmHandlerApi<State> extends AbstractContractHandler<State> {
    private readonly wasmExports;
    constructor(swGlobal: SmartWeaveGlobal, contractDefinition: ContractDefinition<State>, wasmExports: any);
    handle<Input, Result>(executionContext: ExecutionContext<State>, currentResult: EvalStateResult<State>, interactionData: InteractionData<Input>): Promise<InteractionResult<State, Result>>;
    initState(state: State): void;
    private doHandleLegacy;
    private doHandle;
    maybeCallStateConstructor(initialState: State, executionContext: ExecutionContext<State, unknown>): Promise<State>;
    private doGetCurrentState;
}
//# sourceMappingURL=WasmHandlerApi.d.ts.map