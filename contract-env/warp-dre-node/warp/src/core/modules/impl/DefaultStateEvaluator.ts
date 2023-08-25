import Arweave from 'arweave';

import { SortKeyCacheResult } from '../../../cache/SortKeyCache';
import { InteractionCall } from '../../ContractCallRecord';
import { ExecutionContext } from '../../ExecutionContext';
import { ExecutionContextModifier } from '../../ExecutionContextModifier';
import { GQLNodeInterface, GQLTagInterface } from '../../../legacy/gqlResult';
import { Benchmark } from '../../../logging/Benchmark';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { indent } from '../../../utils/utils';
import { EvalStateResult, StateEvaluator } from '../StateEvaluator';
import { ContractInteraction, HandlerApi, InteractionResult } from './HandlerExecutorFactory';
import { TagsParser } from './TagsParser';
import { VrfPluginFunctions } from '../../WarpPlugin';
import { BasicSortKeyCache } from '../../../cache/BasicSortKeyCache';

type EvaluationProgressInput = {
  contractTxId: string;
  currentInteraction: number;
  allInteractions: number;
  lastInteractionProcessingTime: string;
};

/**
 * This class contains the base functionality of evaluating the contracts state - according
 * to the SmartWeave protocol.
 * Marked as abstract - as without help of any cache - the evaluation in real-life applications
 * would be really slow - so using this class without any caching ({@link CacheableStateEvaluator})
 * mechanism built on top makes no sense.
 */
export abstract class DefaultStateEvaluator implements StateEvaluator {
  private readonly logger = LoggerFactory.INST.create('DefaultStateEvaluator');

  private readonly tagsParser = new TagsParser();

  protected constructor(
    protected readonly arweave: Arweave,
    private readonly executionContextModifiers: ExecutionContextModifier[] = []
  ) {}

  async eval<State>(
    executionContext: ExecutionContext<State, HandlerApi<State>>
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>> {
    return this.doReadState(
      executionContext.sortedInteractions,
      new EvalStateResult<State>(executionContext.contractDefinition.initState, {}, {}),
      executionContext
    );
  }

  protected async doReadState<State>(
    missingInteractions: GQLNodeInterface[],
    baseState: EvalStateResult<State>,
    executionContext: ExecutionContext<State, HandlerApi<State>>
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>> {
    const { ignoreExceptions, stackTrace, internalWrites } = executionContext.evaluationOptions;
    const { contract, contractDefinition, sortedInteractions, warp } = executionContext;

    let currentState = baseState.state;
    let currentSortKey = null;
    const validity = baseState.validity;
    const errorMessages = baseState.errorMessages;
    let executionResult = null;

    // TODO: opt - reuse wasm handlers
    executionContext?.handler.initState(currentState);
    const depth = executionContext.contract.callDepth();

    this.logger.debug(
      `${indent(depth)}Evaluating state for ${contractDefinition.txId} [${missingInteractions.length} non-cached of ${
        sortedInteractions.length
      } all]`
    );

    let errorMessage = null;
    let lastConfirmedTxState: { tx: GQLNodeInterface; state: EvalStateResult<State> } = null;

    const missingInteractionsLength = missingInteractions.length;

    const evmSignatureVerificationPlugin = warp.maybeLoadPlugin<GQLNodeInterface, Promise<boolean>>(
      'evm-signature-verification'
    );
    const progressPlugin = warp.maybeLoadPlugin<EvaluationProgressInput, void>('evaluation-progress');
    const vrfPlugin = warp.maybeLoadPlugin<void, VrfPluginFunctions>('vrf');

    let shouldBreakAfterEvolve = false;

    for (let i = 0; i < missingInteractionsLength; i++) {
      if (shouldBreakAfterEvolve) {
        break;
      }

      contract
        .interactionState()
        .setInitial(contract.txId(), new EvalStateResult(currentState, validity, errorMessages));

      const missingInteraction = missingInteractions[i];
      const singleInteractionBenchmark = Benchmark.measure();
      currentSortKey = missingInteraction.sortKey;

      if (missingInteraction.vrf) {
        if (!vrfPlugin) {
          this.logger.warn('Cannot verify vrf for interaction - no "warp-contracts-plugin-vrf" attached!');
        } else {
          if (!vrfPlugin.process().verify(missingInteraction.vrf, missingInteraction.sortKey)) {
            throw new Error('Vrf verification failed.');
          }
        }
      }

      if (evmSignatureVerificationPlugin && this.tagsParser.isEvmSigned(missingInteraction)) {
        try {
          if (!(await evmSignatureVerificationPlugin.process(missingInteraction))) {
            this.logger.warn(`Interaction ${missingInteraction.id} was not verified, skipping.`);
            continue;
          }
        } catch (e) {
          this.logger.error(e);
          continue;
        }
      }

      this.logger.debug(
        `${indent(depth)}[${contractDefinition.txId}][${missingInteraction.id}][${missingInteraction.block.height}]: ${
          missingInteractions.indexOf(missingInteraction) + 1
        }/${missingInteractions.length} [of all:${sortedInteractions.length}]`
      );

      const isInteractWrite = this.tagsParser.isInteractWrite(missingInteraction, contractDefinition.txId);
      // other contract makes write ("writing contract") on THIS contract
      if (isInteractWrite && internalWrites) {
        // evaluating txId of the contract that is writing on THIS contract
        const writingContractTxId = this.tagsParser.getContractTag(missingInteraction);
        this.logger.debug(`${indent(depth)}Internal Write - Loading writing contract`, writingContractTxId);

        const interactionCall: InteractionCall = contract
          .getCallStack()
          .addInteractionData({ interaction: null, interactionTx: missingInteraction });

        // creating a Contract instance for the "writing" contract
        const writingContract = warp.contract(writingContractTxId, executionContext.contract, {
          callingInteraction: missingInteraction,
          callType: 'read'
        });

        this.logger.debug(`${indent(depth)}Reading state of the calling contract at`, missingInteraction.sortKey);
        /**
         Reading the state of the writing contract.
         This in turn will cause the state of THIS contract to be
         updated in uncommitted state
         */
        let newState: EvalStateResult<unknown> = null;
        try {
          await writingContract.readState(missingInteraction.sortKey);
          newState = contract.interactionState().get(contract.txId());
        } catch (e) {
          if (e.name == 'ContractError' && e.subtype == 'unsafeClientSkip') {
            this.logger.warn('Skipping unsafe contract in internal write');
            errorMessages[missingInteraction.id] = e;
            if (canBeCached(missingInteraction)) {
              const toCache = new EvalStateResult(currentState, validity, errorMessages);
              lastConfirmedTxState = {
                tx: missingInteraction,
                state: toCache
              };
            }
          } else {
            throw e;
          }
        }

        if (newState !== null) {
          currentState = newState.state as State;
          // we need to update the state in the wasm module
          // TODO: opt - reuse wasm handlers...
          executionContext?.handler.initState(currentState);

          validity[missingInteraction.id] = newState.validity[missingInteraction.id];
          if (newState.errorMessages?.[missingInteraction.id]) {
            errorMessages[missingInteraction.id] = newState.errorMessages[missingInteraction.id];
          }

          const toCache = new EvalStateResult(currentState, validity, errorMessages);
          if (canBeCached(missingInteraction)) {
            lastConfirmedTxState = {
              tx: missingInteraction,
              state: toCache
            };
          }
        } else {
          validity[missingInteraction.id] = false;
        }

        interactionCall.update({
          cacheHit: false,
          outputState: stackTrace.saveState ? currentState : undefined,
          executionTime: singleInteractionBenchmark.elapsed(true) as number,
          valid: validity[missingInteraction.id],
          errorMessage: errorMessage,
          gasUsed: 0 // TODO...
        });
      } else {
        // "direct" interaction with this contract - "standard" processing
        const inputTag = this.tagsParser.getInputTag(missingInteraction, executionContext.contractDefinition.txId);
        if (!inputTag) {
          this.logger.error(`${indent(depth)}Skipping tx - Input tag not found for ${missingInteraction.id}`);
          continue;
        }
        const input = this.parseInput(inputTag);
        if (!input) {
          this.logger.error(`${indent(depth)}Skipping tx - invalid Input tag - ${missingInteraction.id}`);
          continue;
        }

        const interaction: ContractInteraction<unknown> = {
          input,
          caller: missingInteraction.owner.address,
          interactionType: 'write'
        };

        const interactionData = {
          interaction,
          interactionTx: missingInteraction
        };

        const interactionCall: InteractionCall = contract.getCallStack().addInteractionData(interactionData);

        const result = await executionContext.handler.handle(
          executionContext,
          new EvalStateResult(currentState, validity, errorMessages),
          interactionData
        );

        errorMessage = result.errorMessage;
        if (result.type !== 'ok') {
          errorMessages[missingInteraction.id] = errorMessage;
        }

        this.logResult<State>(result, missingInteraction, executionContext);

        this.logger.debug(`${indent(depth)}Interaction evaluation`, singleInteractionBenchmark.elapsed());

        interactionCall.update({
          cacheHit: false,
          outputState: stackTrace.saveState ? currentState : undefined,
          executionTime: singleInteractionBenchmark.elapsed(true) as number,
          valid: validity[missingInteraction.id],
          errorMessage: errorMessage,
          gasUsed: result.gasUsed
        });

        if (result.type === 'exception' && ignoreExceptions !== true) {
          throw new Error(`Exception while processing ${JSON.stringify(interaction)}:\n${result.errorMessage}`);
        }

        validity[missingInteraction.id] = result.type === 'ok';
        currentState = result.state;
        executionResult = result.result;

        const toCache = new EvalStateResult(currentState, validity, errorMessages, executionResult);
        if (canBeCached(missingInteraction)) {
          lastConfirmedTxState = {
            tx: missingInteraction,
            state: toCache
          };
        }
      }

      if (progressPlugin) {
        progressPlugin.process({
          contractTxId: contractDefinition.txId,
          allInteractions: missingInteractionsLength,
          currentInteraction: i,
          lastInteractionProcessingTime: singleInteractionBenchmark.elapsed() as string
        });
      }

      try {
        for (const { modify } of this.executionContextModifiers) {
          executionContext = await modify<State>(currentState, executionContext);
        }
      } catch (e) {
        if (e.name == 'ContractError' && e.subtype == 'unsafeClientSkip') {
          validity[missingInteraction.id] = false;
          errorMessages[missingInteraction.id] = e.message;
          shouldBreakAfterEvolve = true;
        } else {
          throw e;
        }
      }

      // if that's the end of the root contract's interaction - commit all the uncommitted states to cache.
      if (contract.isRoot()) {
        // update the uncommitted state of the root contract
        if (lastConfirmedTxState) {
          contract.interactionState().update(contract.txId(), lastConfirmedTxState.state);
          if (validity[missingInteraction.id]) {
            await contract.interactionState().commit(missingInteraction);
          } else {
            await contract.interactionState().rollback(missingInteraction);
          }
        }
      } else {
        // if that's an inner contract call - only update the state in the uncommitted states
        contract.interactionState().update(contract.txId(), new EvalStateResult(currentState, validity, errorMessages));
      }
    }
    const evalStateResult = new EvalStateResult<State>(
      currentState, 
      validity, 
      errorMessages, 
      executionResult ? executionResult : undefined
    );

    // state could have been fully retrieved from cache
    // or there were no interactions below requested sort key
    if (lastConfirmedTxState !== null) {
      await this.onStateEvaluated(lastConfirmedTxState.tx, executionContext, lastConfirmedTxState.state);
    }

    return new SortKeyCacheResult(currentSortKey, evalStateResult);
  }

  private logResult<State>(
    result: InteractionResult<State, unknown>,
    currentTx: GQLNodeInterface,
    executionContext: ExecutionContext<State, HandlerApi<State>>
  ) {
    if (result.type === 'exception') {
      this.logger.error(
        `Executing of interaction: [${executionContext.contractDefinition.txId} -> ${currentTx.id}] threw exception:`,
        `${result.errorMessage}`
      );
    }
    if (result.type === 'error') {
      this.logger.warn(
        `Executing of interaction: [${executionContext.contractDefinition.txId} -> ${currentTx.id}] returned error:`,
        result.errorMessage
      );
    }
  }

  private parseInput(inputTag: GQLTagInterface): unknown | null {
    try {
      return JSON.parse(inputTag.value);
    } catch (e) {
      this.logger.error(e);
      return null;
    }
  }

  abstract latestAvailableState<State>(
    contractTxId: string,
    sortKey?: string
  ): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;

  abstract onContractCall<State>(
    transaction: GQLNodeInterface,
    executionContext: ExecutionContext<State>,
    state: EvalStateResult<State>
  ): Promise<void>;

  abstract onInternalWriteStateUpdate<State>(
    transaction: GQLNodeInterface,
    contractTxId: string,
    state: EvalStateResult<State>
  ): Promise<void>;

  abstract onStateEvaluated<State>(
    transaction: GQLNodeInterface,
    executionContext: ExecutionContext<State>,
    state: EvalStateResult<State>
  ): Promise<void>;

  abstract onStateUpdate<State>(
    transaction: GQLNodeInterface,
    executionContext: ExecutionContext<State>,
    state: EvalStateResult<State>,
    force?: boolean
  ): Promise<void>;

  abstract putInCache<State>(
    contractTxId: string,
    transaction: GQLNodeInterface,
    state: EvalStateResult<State>
  ): Promise<void>;

  abstract syncState<State>(
    contractTxId: string,
    sortKey: string,
    state: State,
    validity: Record<string, boolean>
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract dumpCache(): Promise<any>;

  abstract internalWriteState<State>(
    contractTxId: string,
    sortKey: string
  ): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;

  abstract hasContractCached(contractTxId: string): Promise<boolean>;

  abstract lastCachedSortKey(): Promise<string | null>;

  abstract setCache(cache: BasicSortKeyCache<EvalStateResult<unknown>>): void;

  abstract getCache(): BasicSortKeyCache<EvalStateResult<unknown>>;
}

function canBeCached(tx: GQLNodeInterface): boolean {
  // in case of using non-redstone gateway
  if (tx.confirmationStatus === undefined) {
    return true;
  } else {
    return tx.confirmationStatus === 'confirmed';
  }
}
