import { GQLNodeInterface } from 'legacy/gqlResult';
import { ContractDefinition } from '../../../ContractDefinition';
import { ExecutionContext } from '../../../ExecutionContext';
import { EvalStateResult } from '../../StateEvaluator';
import { SWBlock, SmartWeaveGlobal, SWTransaction, SWVrf } from '../../../../legacy/smartweave-global';
import { deepCopy, timeout } from '../../../../utils/utils';
import { ContractInteraction, InteractionData, InteractionResult } from '../HandlerExecutorFactory';
import { genesisSortKey } from '../LexicographicalInteractionsSorter';
import { AbstractContractHandler } from './AbstractContractHandler';

const INIT_FUNC_NAME = '__init';
const throwErrorWithName = (name: string, message: string) => {
  const error = new Error(message);
  error.name = name;
  throw error;
};
enum KnownErrors {
  ContractError = 'ContractError',
  ConstructorError = 'ConstructorError'
}

export class JsHandlerApi<State> extends AbstractContractHandler<State> {
  constructor(
    swGlobal: SmartWeaveGlobal,
    contractDefinition: ContractDefinition<State>,
    // eslint-disable-next-line
    private readonly contractFunction: Function
  ) {
    super(swGlobal, contractDefinition);
  }

  async handle<Input, Result>(
    executionContext: ExecutionContext<State>,
    currentResult: EvalStateResult<State>,
    interactionData: InteractionData<Input>
  ): Promise<InteractionResult<State, Result>> {
    const { interaction, interactionTx } = interactionData;

    this.setupSwGlobal(interactionData);
    this.enableInternalWrites(executionContext, interactionTx);

    this.assertNotConstructorCall<Input>(interaction);

    return await this.runContractFunction(executionContext, interaction, currentResult.state);
  }

  // eslint-disable-next-line
  initState(state: State) {}

  async maybeCallStateConstructor<Input>(
    initialState: State,
    executionContext: ExecutionContext<State>
  ): Promise<State> {
    if (this.contractDefinition.manifest?.evaluationOptions?.useConstructor) {
      const interaction: ContractInteraction<Input> = {
        input: { function: INIT_FUNC_NAME, args: initialState } as Input,
        caller: this.contractDefinition.owner,
        interactionType: 'write'
      };

      const interactionTx = {
        owner: { address: executionContext.caller, key: null },
        sortKey: genesisSortKey
      } as GQLNodeInterface;
      const interactionData: InteractionData<Input> = { interaction, interactionTx };

      this.setupSwGlobal(interactionData);
      const cleanUpSwGlobal = this.configureSwGlobalForConstructor();

      const result = await this.runContractFunction(executionContext, interaction, {} as State);

      cleanUpSwGlobal();
      if (result.type !== 'ok') {
        throw new Error(`Exception while calling constructor: ${JSON.stringify(interaction)}:\n${result.errorMessage}`);
      }
      return result.state;
    } else {
      return initialState;
    }
  }

  private assertNotConstructorCall<Input>(interaction: ContractInteraction<Input>) {
    if (
      this.contractDefinition.manifest?.evaluationOptions?.useConstructor &&
      interaction.input['function'] === INIT_FUNC_NAME
    ) {
      throw new Error(`You have enabled {useConstructor: true} option, so you can't call function ${INIT_FUNC_NAME}`);
    }
  }

  private configureSwGlobalForConstructor() {
    const handler = (prop) => ({
      get: (target, property) =>
        throwErrorWithName(
          'ConstructorError',
          `SmartWeave.${prop}.${String(property)} is not accessible in constructor context`
        )
    });

    this.swGlobal.contracts.readContractState = () =>
      throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
    this.swGlobal.contracts.viewContractState = () =>
      throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
    this.swGlobal.contracts.refreshState = () =>
      throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
    this.swGlobal.contracts.write = () =>
      throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');

    const originalBlock = new SWBlock(this.swGlobal);
    this.swGlobal.block = new Proxy(this.swGlobal.block, handler('block'));

    const originalVrf = new SWVrf(this.swGlobal);
    this.swGlobal.vrf = new Proxy(this.swGlobal.vrf, handler('vrf'));

    const originalTransaction = new SWTransaction(this.swGlobal);
    this.swGlobal.transaction = new Proxy(this.swGlobal.vrf, handler('transaction'));

    return () => {
      this.swGlobal.block = originalBlock;
      this.swGlobal.vrf = originalVrf;
      this.swGlobal.transaction = originalTransaction;
    };
  }

  private async runContractFunction<Input>(
    executionContext: ExecutionContext<State>,
    interaction: InteractionData<Input>['interaction'],
    state: State
  ) {
    const stateClone = deepCopy(state);
    const { timeoutId, timeoutPromise } = timeout(
      executionContext.evaluationOptions.maxInteractionEvaluationTimeSeconds
    );

    try {
      await this.swGlobal.kv.open();
      await this.swGlobal.kv.begin();

      const handlerResult = await Promise.race([timeoutPromise, this.contractFunction(stateClone, interaction)]);

      if (handlerResult && (handlerResult.state !== undefined || handlerResult.result !== undefined)) {
        await this.swGlobal.kv.commit();
        return {
          type: 'ok' as const,
          result: handlerResult.result,
          state: handlerResult.state || stateClone
        };
      }

      // Will be caught below as unexpected exception.
      throw new Error(`Unexpected result from contract: ${JSON.stringify(handlerResult)}`);
    } catch (err) {
      await this.swGlobal.kv.rollback();
      switch (err.name) {
        case KnownErrors.ContractError:
          return {
            type: 'error' as const,
            errorMessage: err.message,
            state: state,
            result: null
          };
        case KnownErrors.ConstructorError:
          throw Error(`ConstructorError: ${err.message}`);
        default:
          return {
            type: 'exception' as const,
            errorMessage: `${(err && err.stack) || (err && err.message) || err}`,
            state: state,
            result: null
          };
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      await this.swGlobal.kv.close();
    }
  }

  private setupSwGlobal<Input>({ interaction, interactionTx }: InteractionData<Input>) {
    this.swGlobal._activeTx = interactionTx;
    this.swGlobal.caller = interaction.caller; // either contract tx id (for internal writes) or transaction.owner
  }

  private enableInternalWrites<Input>(
    executionContext: ExecutionContext<State, unknown>,
    interactionTx: GQLNodeInterface
  ) {
    this.assignReadContractState(executionContext, interactionTx);
    this.assignViewContractState<Input>(executionContext);
    this.assignWrite(executionContext);
    this.assignRefreshState(executionContext);
  }
}
