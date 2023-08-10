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
export class DebuggableExecutorFactory<Api> implements ExecutorFactory<Api> {
  constructor(
    private readonly baseImplementation: ExecutorFactory<Api>,
    // contract source code before default "normalization"
    private readonly sourceCode: { [key: string]: string }
  ) {}

  async create<State>(
    contractDefinition: ContractDefinition<State>,
    evaluationOptions: EvaluationOptions,
    warp: Warp,
    interactionState: InteractionState
  ): Promise<Api> {
    if (Object.prototype.hasOwnProperty.call(this.sourceCode, contractDefinition.txId)) {
      contractDefinition = {
        ...contractDefinition,
        src: this.sourceCode[contractDefinition.txId]
      };
    }

    return await this.baseImplementation.create(contractDefinition, evaluationOptions, warp, interactionState);
  }
}
