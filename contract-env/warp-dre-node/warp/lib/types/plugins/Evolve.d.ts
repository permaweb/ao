import { ExecutionContext } from '../core/ExecutionContext';
import { ExecutionContextModifier } from '../core/ExecutionContextModifier';
import { HandlerApi } from '../core/modules/impl/HandlerExecutorFactory';
export declare class Evolve implements ExecutionContextModifier {
    private readonly logger;
    constructor();
    modify<State>(state: State, executionContext: ExecutionContext<State, HandlerApi<State>>): Promise<ExecutionContext<State, HandlerApi<State>>>;
    static evolvedSrcTxId(state: unknown): string | undefined;
}
//# sourceMappingURL=Evolve.d.ts.map