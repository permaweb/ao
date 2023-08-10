import { ExecutionContext } from './ExecutionContext';
import { HandlerApi } from './modules/impl/HandlerExecutorFactory';
/**
 * This adds ability to modify current execution context based
 * on state - example (and currently only) use case is the "evolve" feature.
 */
export interface ExecutionContextModifier {
    modify<State>(state: State, executionContext: ExecutionContext<State, HandlerApi<State>>): Promise<ExecutionContext<State, HandlerApi<State>>>;
}
//# sourceMappingURL=ExecutionContextModifier.d.ts.map