import { ContractDefinition } from '../ContractDefinition';
import { EvaluationOptions } from './StateEvaluator';
import { Warp } from '../Warp';
import { InteractionState } from '../../contract/states/InteractionState';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContractApi {}

/**
 * An interface for all the factories that produce Warp contracts "executors" -
 * i.e. objects that are responsible for actually running the contract's code.
 */
export interface ExecutorFactory<Api> {
  create<State>(
    contractDefinition: ContractDefinition<State>,
    evaluationOptions: EvaluationOptions,
    warp: Warp,
    interactionState: InteractionState
  ): Promise<Api>;
}
