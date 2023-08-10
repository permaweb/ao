import { ContractDefinition } from '../core/ContractDefinition';
import { ExecutorFactory } from '../core/modules/ExecutorFactory';
import { EvaluationOptions } from '../core/modules/StateEvaluator';
import { Warp } from '../core/Warp';
import { InteractionState } from '../contract/states/InteractionState';
/**
 * An ExecutorFactory that allows to substitute original contract's source code.
 * Useful for debugging purposes (e.g. to quickly add some console.logs in contract
 * or to test a fix or a new feature - without the need of redeploying a new contract on Arweave);
 *
 * Not meant to be used in production env! ;-)
 */
export declare class DebuggableExecutorFactory<Api> implements ExecutorFactory<Api> {
    private readonly baseImplementation;
    private readonly sourceCode;
    constructor(baseImplementation: ExecutorFactory<Api>, sourceCode: {
        [key: string]: string;
    });
    create<State>(contractDefinition: ContractDefinition<State>, evaluationOptions: EvaluationOptions, warp: Warp, interactionState: InteractionState): Promise<Api>;
}
//# sourceMappingURL=DebuggableExecutorFactor.d.ts.map