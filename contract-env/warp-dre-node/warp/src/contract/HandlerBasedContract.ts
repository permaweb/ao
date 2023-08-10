import stringify from 'safe-stable-stringify';
import { SortKeyCacheResult } from '../cache/SortKeyCache';
import { ContractCallRecord, InteractionCall } from '../core/ContractCallRecord';
import { ExecutionContext } from '../core/ExecutionContext';
import {
  ContractInteraction,
  HandlerApi,
  InteractionData,
  InteractionResult,
  InteractionType
} from '../core/modules/impl/HandlerExecutorFactory';
import { LexicographicalInteractionsSorter } from '../core/modules/impl/LexicographicalInteractionsSorter';
import { InteractionsSorter } from '../core/modules/InteractionsSorter';
import { DefaultEvaluationOptions, EvalStateResult, EvaluationOptions } from '../core/modules/StateEvaluator';
import { WARP_TAGS } from '../core/KnownTags';
import { Warp } from '../core/Warp';
import { createDummyTx, createInteractionTagsList, createInteractionTx } from '../legacy/create-interaction-tx';
import { GQLNodeInterface } from '../legacy/gqlResult';
import { Benchmark } from '../logging/Benchmark';
import { LoggerFactory } from '../logging/LoggerFactory';
import { Evolve } from '../plugins/Evolve';
import { ArweaveWrapper } from '../utils/ArweaveWrapper';
import { getJsonResponse, isBrowser, sleep, stripTrailingSlash } from '../utils/utils';
import {
  BenchmarkStats,
  Contract,
  DREContractStatusResponse,
  InnerCallData,
  WriteInteractionOptions,
  WriteInteractionResponse
} from './Contract';
import { ArTransfer, ArWallet, emptyTransfer, Tags } from './deploy/CreateContract';
import { InnerWritesEvaluator } from './InnerWritesEvaluator';
import { CustomSignature, Signature } from './Signature';
import { EvaluationOptionsEvaluator } from './EvaluationOptionsEvaluator';
import { WarpFetchWrapper } from '../core/WarpFetchWrapper';
import { Mutex } from 'async-mutex';
import { Tag, TransactionStatusResponse } from '../utils/types/arweave-types';
import { InteractionState } from './states/InteractionState';
import { ContractInteractionState } from './states/ContractInteractionState';
import { Crypto } from 'warp-isomorphic';
import { VrfPluginFunctions } from '../core/WarpPlugin';
import Arweave from 'arweave';
import { createData, tagsExceedLimit, DataItem, Signer } from 'warp-arbundles';

/**
 * An implementation of {@link Contract} that is backwards compatible with current style
 * of writing SW contracts (ie. using the "handle" function).
 *
 * It requires {@link ExecutorFactory} that is using {@link HandlerApi} generic type.
 */

export class HandlerBasedContract<State> implements Contract<State> {
  private readonly logger = LoggerFactory.INST.create('HandlerBasedContract');

  // TODO: refactor: extract execution context logic to a separate class
  private readonly ecLogger = LoggerFactory.INST.create('ExecutionContext');

  private readonly _innerWritesEvaluator = new InnerWritesEvaluator();
  private readonly _callDepth: number;
  private readonly _arweaveWrapper: ArweaveWrapper;
  private readonly _mutex = new Mutex();

  private _callStack: ContractCallRecord;
  private _evaluationOptions: EvaluationOptions;
  private _eoEvaluator: EvaluationOptionsEvaluator; // this is set after loading Contract Definition for the root contract
  private _benchmarkStats: BenchmarkStats = null;

  private _sorter: InteractionsSorter;
  private _rootSortKey: string;
  private _signature: Signature;
  private _warpFetchWrapper: WarpFetchWrapper;
  private _children: HandlerBasedContract<unknown>[] = [];
  private _interactionState;
  private _dreStates = new Map<string, SortKeyCacheResult<EvalStateResult<State>>>();

  constructor(
    private readonly _contractTxId: string,
    protected readonly warp: Warp,
    private readonly _parentContract: Contract = null,
    private readonly _innerCallData: InnerCallData = null
  ) {
    this.waitForConfirmation = this.waitForConfirmation.bind(this);
    this._arweaveWrapper = new ArweaveWrapper(warp);
    this._sorter = new LexicographicalInteractionsSorter(warp.arweave);
    if (_parentContract != null) {
      this._evaluationOptions = this.getRoot().evaluationOptions();
      this._callDepth = _parentContract.callDepth() + 1;
      const callingInteraction: InteractionCall = _parentContract
        .getCallStack()
        .getInteraction(_innerCallData.callingInteraction.id);

      if (this._callDepth > this._evaluationOptions.maxCallDepth) {
        throw new Error(
          `Max call depth of ${this._evaluationOptions.maxCallDepth} has been exceeded for interaction ${JSON.stringify(
            callingInteraction.interactionInput
          )}`
        );
      }
      this.logger.debug('Calling interaction', {
        id: _innerCallData.callingInteraction.id,
        sortKey: _innerCallData.callingInteraction.sortKey,
        type: _innerCallData.callType
      });

      // if you're reading a state of the contract, on which you've just made a write - you're doing it wrong.
      // the current state of the callee contract is always in the result of an internal write.
      // following is a protection against naughty developers who might be doing such crazy things ;-)
      if (
        callingInteraction.interactionInput?.foreignContractCalls[_contractTxId]?.innerCallType === 'write' &&
        _innerCallData.callType === 'read'
      ) {
        throw new Error(
          'Calling a readContractState after performing an inner write is wrong - instead use a state from the result of an internal write.'
        );
      }

      const callStack = new ContractCallRecord(_contractTxId, this._callDepth, _innerCallData?.callType);
      callingInteraction.interactionInput.foreignContractCalls[_contractTxId] = callStack;
      this._callStack = callStack;
      this._rootSortKey = _parentContract.rootSortKey;
      (_parentContract as HandlerBasedContract<unknown>)._children.push(this);
    } else {
      this._callDepth = 0;
      this._callStack = new ContractCallRecord(_contractTxId, 0);
      this._rootSortKey = null;
      this._evaluationOptions = new DefaultEvaluationOptions();
      this._children = [];
      this._interactionState = new ContractInteractionState(warp);
    }

    this.getCallStack = this.getCallStack.bind(this);
    this._warpFetchWrapper = new WarpFetchWrapper(this.warp);
  }

  async readState(
    sortKeyOrBlockHeight?: string | number,
    caller?: string,
    interactions?: GQLNodeInterface[]
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>> {
    this.logger.info('Read state for', {
      contractTxId: this._contractTxId,
      sortKeyOrBlockHeight
    });
    if (!this.isRoot() && sortKeyOrBlockHeight == null) {
      throw new Error('SortKey MUST be always set for non-root contract calls');
    }
    const { stateEvaluator } = this.warp;
    const sortKey =
      typeof sortKeyOrBlockHeight == 'number'
        ? this._sorter.generateLastSortKey(sortKeyOrBlockHeight)
        : sortKeyOrBlockHeight;

    if (sortKey && !this.isRoot() && this.interactionState().has(this.txId())) {
      const result = this.interactionState().get(this.txId());
      return new SortKeyCacheResult<EvalStateResult<State>>(sortKey, result as EvalStateResult<State>);
    }

    // TODO: not sure if we should synchronize on a contract instance or contractTxId
    // in the latter case, the warp instance should keep a map contractTxId -> mutex
    const releaseMutex = await this._mutex.acquire();
    try {
      const initBenchmark = Benchmark.measure();
      this.maybeResetRootContract();

      const executionContext = await this.createExecutionContext(this._contractTxId, sortKey, false, interactions);
      this.logger.info('Execution Context', {
        srcTxId: executionContext.contractDefinition?.srcTxId,
        missingInteractions: executionContext.sortedInteractions?.length,
        cachedSortKey: executionContext.cachedState?.sortKey
      });
      initBenchmark.stop();

      const stateBenchmark = Benchmark.measure();
      const result = await stateEvaluator.eval(executionContext);
      stateBenchmark.stop();

      const total = (initBenchmark.elapsed(true) as number) + (stateBenchmark.elapsed(true) as number);

      this._benchmarkStats = {
        gatewayCommunication: initBenchmark.elapsed(true) as number,
        stateEvaluation: stateBenchmark.elapsed(true) as number,
        total
      };

      this.logger.info('Benchmark', {
        'Gateway communication  ': initBenchmark.elapsed(),
        'Contract evaluation    ': stateBenchmark.elapsed(),
        'Total:                 ': `${total.toFixed(0)}ms`
      });

      if (sortKey && !this.isRoot()) {
        this.interactionState().update(this.txId(), result.cachedValue);
      }

      return result;
    } finally {
      releaseMutex();
    }
  }

  async readStateFor(
    sortKey: string,
    interactions: GQLNodeInterface[]
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>> {
    return this.readState(sortKey, undefined, interactions);
  }

  async viewState<Input, View>(
    input: Input,
    tags: Tags = [],
    transfer: ArTransfer = emptyTransfer,
    caller?: string
  ): Promise<InteractionResult<State, View>> {
    this.logger.info('View state for', this._contractTxId);
    return await this.callContract<Input, View>(input, 'view', caller, undefined, tags, transfer);
  }

  async viewStateForTx<Input, View>(
    input: Input,
    interactionTx: GQLNodeInterface
  ): Promise<InteractionResult<State, View>> {
    this.logger.info(`View state for ${this._contractTxId}`);
    return await this.doApplyInputOnTx<Input, View>(input, interactionTx, 'view');
  }

  async dryWrite<Input>(
    input: Input,
    caller?: string,
    tags?: Tags,
    transfer?: ArTransfer,
    vrf?: boolean
  ): Promise<InteractionResult<State, unknown>> {
    this.logger.info('Dry-write for', this._contractTxId);
    return await this.callContract<Input>(input, 'write', caller, undefined, tags, transfer, undefined, vrf);
  }

  async applyInput<Input>(input: Input, transaction: GQLNodeInterface): Promise<InteractionResult<State, unknown>> {
    this.logger.info(`Apply-input from transaction ${transaction.id} for ${this._contractTxId}`);
    return await this.doApplyInputOnTx<Input>(input, transaction, 'write');
  }

  async writeInteraction<Input>(
    input: Input,
    options?: WriteInteractionOptions
  ): Promise<WriteInteractionResponse | null> {
    this.logger.info('Write interaction', { input, options });
    if (!this._signature) {
      throw new Error("Wallet not connected. Use 'connect' method first.");
    }
    const { arweave, interactionsLoader, environment } = this.warp;

    // we're calling this to verify whether proper env is used for this contract
    // (e.g. test env for test contract)
    await this.warp.definitionLoader.load(this._contractTxId);

    const effectiveTags = options?.tags || [];
    const effectiveTransfer = options?.transfer || emptyTransfer;
    const effectiveStrict = options?.strict === true;
    const effectiveVrf = options?.vrf === true;
    const effectiveDisableBundling = options?.disableBundling === true;
    const effectiveReward = options?.reward;

    const bundleInteraction = interactionsLoader.type() == 'warp' && !effectiveDisableBundling;

    this._signature.checkNonArweaveSigningAvailability(bundleInteraction);
    this._signature.checkBundlerSignerAvailability(bundleInteraction);

    if (
      bundleInteraction &&
      effectiveTransfer.target != emptyTransfer.target &&
      effectiveTransfer.winstonQty != emptyTransfer.winstonQty
    ) {
      throw new Error('Ar Transfers are not allowed for bundled interactions');
    }

    if (effectiveVrf && !bundleInteraction && environment === 'mainnet') {
      throw new Error('Vrf generation is only available for bundle interaction');
    }

    if (!input) {
      throw new Error(`Input should be a truthy value: ${JSON.stringify(input)}`);
    }

    if (bundleInteraction) {
      return await this.bundleInteraction(input, {
        tags: effectiveTags,
        strict: effectiveStrict,
        vrf: effectiveVrf
      });
    } else {
      const interactionTx = await this.createInteraction(
        input,
        effectiveTags,
        effectiveTransfer,
        effectiveStrict,
        false,
        effectiveVrf && environment !== 'mainnet',
        effectiveReward
      );
      const response = await arweave.transactions.post(interactionTx);

      if (response.status !== 200) {
        this.logger.error('Error while posting transaction', response);
        return null;
      }

      if (this._evaluationOptions.waitForConfirmation) {
        this.logger.info('Waiting for confirmation of', interactionTx.id);
        const benchmark = Benchmark.measure();
        await this.waitForConfirmation(interactionTx.id);
        this.logger.info('Transaction confirmed after', benchmark.elapsed());
      }

      if (this.warp.environment == 'local' && this._evaluationOptions.mineArLocalBlocks) {
        await this.warp.testing.mineBlock();
      }

      return { originalTxId: interactionTx.id };
    }
  }

  private async bundleInteraction<Input>(
    input: Input,
    options: {
      tags: Tags;
      strict: boolean;
      vrf: boolean;
    }
  ): Promise<WriteInteractionResponse | null> {
    this.logger.info('Bundle interaction input', input);

    const interactionDataItem = await this.createInteractionDataItem(
      input,
      options.tags,
      emptyTransfer,
      options.strict,
      options.vrf
    );

    const response = this._warpFetchWrapper.fetch(
      `${stripTrailingSlash(this._evaluationOptions.sequencerUrl)}/gateway/v2/sequencer/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        },
        body: interactionDataItem.getRaw()
      }
    );

    const dataItemId = await interactionDataItem.id;

    return {
      bundlrResponse: await getJsonResponse(response),
      originalTxId: dataItemId
    };
  }

  private async createInteractionDataItem<Input>(
    input: Input,
    tags: Tags,
    transfer: ArTransfer,
    strict: boolean,
    vrf = false
  ) {
    if (this._evaluationOptions.internalWrites) {
      // it modifies tags
      await this.discoverInternalWrites<Input>(input, tags, transfer, strict, vrf);
    }

    if (vrf) {
      tags.push(new Tag(WARP_TAGS.REQUEST_VRF, 'true'));
    }

    const interactionTags = createInteractionTagsList(
      this._contractTxId,
      input,
      this.warp.environment === 'testnet',
      tags
    );

    if (tagsExceedLimit(interactionTags)) {
      throw new Error(`Interaction tags exceed limit of 4096 bytes.`);
    }

    const data = Math.random().toString().slice(-4);
    const bundlerSigner = this._signature.bundlerSigner;

    if (!bundlerSigner) {
      throw new Error(
        `Signer not set correctly. If you connect wallet through 'use_wallet', please remember that it only works when bundling is disabled.`
      );
    }

    let interactionDataItem: DataItem;
    if (isBrowser() && bundlerSigner.signer?.signDataItem) {
      interactionDataItem = await bundlerSigner.signDataItem(data, interactionTags);
    } else {
      interactionDataItem = createData(data, bundlerSigner, { tags: interactionTags });
      await interactionDataItem.sign(bundlerSigner);
    }

    if (!this._evaluationOptions.internalWrites && strict) {
      await this.checkInteractionInStrictMode(interactionDataItem.owner, input, tags, transfer, strict, vrf);
    }

    return interactionDataItem;
  }

  private async createInteraction<Input>(
    input: Input,
    tags: Tags,
    transfer: ArTransfer,
    strict: boolean,
    bundle = false,
    vrf = false,
    reward?: string
  ) {
    if (this._evaluationOptions.internalWrites) {
      // it modifies tags
      await this.discoverInternalWrites<Input>(input, tags, transfer, strict, vrf);
    }

    if (vrf) {
      tags.push(new Tag(WARP_TAGS.REQUEST_VRF, 'true'));
    }

    const interactionTx = await createInteractionTx(
      this.warp.arweave,
      this._signature.signer,
      this._contractTxId,
      input,
      tags,
      transfer.target,
      transfer.winstonQty,
      bundle,
      this.warp.environment === 'testnet',
      reward
    );

    if (!this._evaluationOptions.internalWrites && strict) {
      await this.checkInteractionInStrictMode(interactionTx.owner, input, tags, transfer, strict, vrf);
    }

    return interactionTx;
  }

  private async checkInteractionInStrictMode<Input>(
    owner: string,
    input: Input,
    tags: Tags,
    transfer: ArTransfer,
    strict: boolean,
    vrf: boolean
  ) {
    const { arweave } = this.warp;
    const caller = this._signature.type == 'arweave' ? await arweave.wallets.ownerToAddress(owner) : owner;
    const handlerResult = await this.callContract(input, 'write', caller, undefined, tags, transfer, strict, vrf);
    if (handlerResult.type !== 'ok') {
      throw Error('Cannot create interaction: ' + JSON.stringify(handlerResult.error || handlerResult.errorMessage));
    }
  }

  txId(): string {
    return this._contractTxId;
  }

  getCallStack(): ContractCallRecord {
    return this._callStack;
  }

  connect(signature: ArWallet | CustomSignature | Signer): Contract<State> {
    this._signature = new Signature(this.warp, signature);
    return this;
  }

  setEvaluationOptions(options: Partial<EvaluationOptions>): Contract<State> {
    if (!this.isRoot()) {
      throw new Error('Evaluation options can be set only for the root contract');
    }
    this._evaluationOptions = {
      ...this._evaluationOptions,
      ...options
    };
    return this;
  }

  private async waitForConfirmation(transactionId: string): Promise<TransactionStatusResponse> {
    const { arweave } = this.warp;

    const status = await arweave.transactions.getStatus(transactionId);

    if (status.confirmed === null) {
      this.logger.info(`Transaction ${transactionId} not yet confirmed. Waiting another 20 seconds before next check.`);
      await sleep(20000);
      return this.waitForConfirmation(transactionId);
    } else {
      this.logger.info(`Transaction ${transactionId} confirmed`, status);
      return status;
    }
  }

  private async createExecutionContext(
    contractTxId: string,
    upToSortKey?: string,
    forceDefinitionLoad = false,
    interactions?: GQLNodeInterface[]
  ): Promise<ExecutionContext<State, HandlerApi<State>>> {
    const { definitionLoader, interactionsLoader, stateEvaluator } = this.warp;

    const benchmark = Benchmark.measure();
    let cachedState = await stateEvaluator.latestAvailableState<State>(contractTxId, upToSortKey);

    this.logger.debug('cache lookup', benchmark.elapsed());
    benchmark.reset();

    const evolvedSrcTxId = Evolve.evolvedSrcTxId(cachedState?.cachedValue?.state);
    let handler, contractDefinition, contractEvaluationOptions, remoteState;
    let sortedInteractions = interactions || [];

    this.logger.debug('Cached state', cachedState, upToSortKey);

    if (cachedState && cachedState.sortKey == upToSortKey) {
      this.logger.debug('State fully cached, not loading interactions.');
      if (forceDefinitionLoad || evolvedSrcTxId || interactions?.length) {
        contractDefinition = await definitionLoader.load<State>(contractTxId, evolvedSrcTxId);
        if (interactions?.length) {
          sortedInteractions = (await this._sorter.sort(interactions.map((i) => ({ node: i, cursor: null })))).map(
            (i) => i.node
          );
        }
      }
    } else {
      // if we want to apply some 'external' interactions on top of the state cached at given sort key
      // AND we don't have the state cached at the exact requested sort key - throw.
      // NOTE: this feature is used by the D.R.E. nodes.
      if (interactions?.length) {
        throw new Error(`Cannot apply requested interactions at ${upToSortKey}`);
      }

      contractDefinition = await definitionLoader.load<State>(contractTxId, evolvedSrcTxId);
      contractEvaluationOptions = this.resolveEvaluationOptions(contractDefinition.manifest?.evaluationOptions);

      if (contractEvaluationOptions.remoteStateSyncEnabled && !contractEvaluationOptions.useKVStorage) {
        remoteState = await this.getRemoteContractState(contractTxId);
        cachedState = await this.maybeSyncStateWithRemoteSource(remoteState, upToSortKey, cachedState);
        const maybeEvolvedSrcTxId = Evolve.evolvedSrcTxId(cachedState?.cachedValue?.state);
        if (maybeEvolvedSrcTxId && maybeEvolvedSrcTxId !== contractDefinition.srcTxId) {
          // even though the state will be synced, the CacheableStateEvaluator will
          // still try to init it in the WASM module (https://github.com/warp-contracts/warp/issues/372)
          // if the state struct definition has changed via evolve - there is a risk of panic in Rust.
          // that's why the contract definition has to be updated.
          contractDefinition = await definitionLoader.load<State>(contractTxId, maybeEvolvedSrcTxId);
        }
      }

      if (!remoteState && sortedInteractions.length == 0) {
        sortedInteractions = await interactionsLoader.load(
          contractTxId,
          cachedState?.sortKey,
          this.getToSortKey(upToSortKey),
          contractEvaluationOptions
        );
      }

      // we still need to return only interactions up to original "upToSortKey"
      if (cachedState?.sortKey) {
        sortedInteractions = sortedInteractions.filter((i) => i.sortKey.localeCompare(cachedState?.sortKey) > 0);
      }

      if (upToSortKey) {
        sortedInteractions = sortedInteractions.filter((i) => i.sortKey.localeCompare(upToSortKey) <= 0);
      }

      this.logger.debug('contract and interactions load', benchmark.elapsed());
      if (this.isRoot() && sortedInteractions.length) {
        // note: if the root contract has zero interactions, it still should be safe
        // - as no other contracts will be called.
        this._rootSortKey = sortedInteractions[sortedInteractions.length - 1].sortKey;
      }
    }

    if (contractDefinition) {
      if (!contractEvaluationOptions) {
        contractEvaluationOptions = this.resolveEvaluationOptions(contractDefinition.manifest?.evaluationOptions);
      }

      this.ecLogger.debug(`Evaluation options ${contractTxId}:`, contractEvaluationOptions);

      handler = (await this.warp.executorFactory.create(
        contractDefinition,
        contractEvaluationOptions,
        this.warp,
        this.interactionState()
      )) as HandlerApi<State>;
    }

    return {
      warp: this.warp,
      contract: this,
      contractDefinition,
      sortedInteractions,
      evaluationOptions: contractEvaluationOptions || this.evaluationOptions(),
      handler,
      cachedState,
      requestedSortKey: upToSortKey
    };
  }

  private resolveEvaluationOptions(rootManifestEvalOptions: EvaluationOptions) {
    if (this.isRoot()) {
      this._eoEvaluator = new EvaluationOptionsEvaluator(this.evaluationOptions(), rootManifestEvalOptions);
      return this._eoEvaluator.rootOptions;
    }
    return this.getRootEoEvaluator().forForeignContract(rootManifestEvalOptions);
  }

  private async getRemoteContractState(contractId: string): Promise<SortKeyCacheResult<EvalStateResult<State>>> {
    if (this.hasDreState(contractId)) {
      return this.getDreState(contractId);
    } else {
      const dreResponse = await this.fetchRemoteContractState(contractId);
      if (dreResponse != null) {
        return this.setDREState(contractId, dreResponse);
      }
      return null;
    }
  }

  private async fetchRemoteContractState(contractId: string): Promise<DREContractStatusResponse<State> | null> {
    return getJsonResponse(
      this._warpFetchWrapper.fetch(`${this._evaluationOptions.remoteStateSyncSource}?id=${contractId}&events=false`)
    );
  }

  private getToSortKey(upToSortKey?: string) {
    if (this._parentContract?.rootSortKey) {
      if (!upToSortKey) {
        return this._parentContract.rootSortKey;
      }
      return this._parentContract.rootSortKey.localeCompare(upToSortKey) > 0
        ? this._parentContract.rootSortKey
        : upToSortKey;
    } else {
      return upToSortKey;
    }
  }

  private async createExecutionContextFromTx(
    contractTxId: string,
    transaction: GQLNodeInterface
  ): Promise<ExecutionContext<State, HandlerApi<State>>> {
    const caller = transaction.owner.address;
    const sortKey = transaction.sortKey;

    const baseContext = await this.createExecutionContext(contractTxId, sortKey, true);

    return {
      ...baseContext,
      caller
    };
  }

  private maybeResetRootContract() {
    if (this.isRoot()) {
      this.logger.debug('Clearing call stack for the root contract');
      this._callStack = new ContractCallRecord(this.txId(), 0);
      this._rootSortKey = null;
      this.warp.interactionsLoader.clearCache();
      this._children = [];
      this._interactionState = new ContractInteractionState(this.warp);
      this._dreStates = new Map();
    }
  }

  private async callContract<Input, View = unknown>(
    input: Input,
    interactionType: InteractionType,
    caller?: string,
    sortKey?: string,
    tags: Tags = [],
    transfer: ArTransfer = emptyTransfer,
    strict = false,
    vrf = false,
    sign = true
  ): Promise<InteractionResult<State, View>> {
    this.logger.info('Call contract input', input);
    this.maybeResetRootContract();
    if (!this._signature) {
      this.logger.warn('Wallet not set.');
    }
    const { arweave, stateEvaluator } = this.warp;
    // create execution context
    let executionContext = await this.createExecutionContext(this._contractTxId, sortKey, true);

    const currentBlockData =
      this.warp.environment == 'mainnet' ? await this._arweaveWrapper.warpGwBlock() : await arweave.blocks.getCurrent();

    // add caller info to execution context
    let effectiveCaller;
    if (caller) {
      effectiveCaller = caller;
    } else if (this._signature) {
      effectiveCaller = await this._signature.getAddress();
    } else {
      effectiveCaller = '';
    }

    this.logger.info('effectiveCaller', effectiveCaller);
    executionContext = {
      ...executionContext,
      caller: effectiveCaller
    };

    // eval current state
    const evalStateResult = await stateEvaluator.eval<State>(executionContext);
    this.logger.info('Current state', evalStateResult.cachedValue.state);

    // create interaction transaction
    const interaction: ContractInteraction<Input> = {
      input,
      caller: executionContext.caller,
      interactionType
    };

    this.logger.debug('interaction', interaction);
    const tx = await createInteractionTx(
      arweave,
      sign ? this._signature?.signer : undefined,
      this._contractTxId,
      input,
      tags,
      transfer.target,
      transfer.winstonQty,
      true,
      this.warp.environment === 'testnet'
    );
    const dummyTx = createDummyTx(tx, executionContext.caller, currentBlockData);

    this.logger.debug('Creating sortKey for', {
      blockId: dummyTx.block.id,
      id: dummyTx.id,
      height: dummyTx.block.height
    });

    dummyTx.sortKey = await this._sorter.createSortKey(dummyTx.block.id, dummyTx.id, dummyTx.block.height, true);
    dummyTx.strict = strict;
    if (vrf) {
      Arweave.utils;
      const vrfPlugin = this.warp.maybeLoadPlugin<void, VrfPluginFunctions>('vrf');
      if (vrfPlugin) {
        dummyTx.vrf = vrfPlugin.process().generateMockVrf(dummyTx.sortKey);
      } else {
        this.logger.warn('Cannot generate mock vrf for interaction - no "warp-contracts-plugin-vrf" attached!');
      }
    }

    const handleResult = await this.evalInteraction<Input, View>(
      {
        interaction,
        interactionTx: dummyTx
      },
      executionContext,
      evalStateResult.cachedValue
    );

    if (handleResult.type !== 'ok') {
      this.logger.fatal('Error while interacting with contract', {
        type: handleResult.type,
        error: handleResult.errorMessage
      });
    }

    return handleResult;
  }

  private async doApplyInputOnTx<Input, View = unknown>(
    input: Input,
    interactionTx: GQLNodeInterface,
    interactionType: InteractionType
  ): Promise<InteractionResult<State, View>> {
    this.maybeResetRootContract();

    let evalStateResult: SortKeyCacheResult<EvalStateResult<State>>;

    const executionContext = await this.createExecutionContextFromTx(this._contractTxId, interactionTx);

    if (!this.isRoot() && this.interactionState().has(this.txId())) {
      evalStateResult = new SortKeyCacheResult<EvalStateResult<State>>(
        interactionTx.sortKey,
        this.interactionState().get(this.txId()) as EvalStateResult<State>
      );
    } else {
      evalStateResult = await this.warp.stateEvaluator.eval<State>(executionContext);
      this.interactionState().update(this.txId(), evalStateResult.cachedValue);
    }

    this.logger.debug('callContractForTx - evalStateResult', {
      result: evalStateResult.cachedValue.state,
      txId: this._contractTxId
    });

    const interaction: ContractInteraction<Input> = {
      input,
      caller: this._parentContract.txId(),
      interactionType
    };

    const interactionData: InteractionData<Input> = {
      interaction,
      interactionTx
    };

    const result = await this.evalInteraction<Input, View>(
      interactionData,
      executionContext,
      evalStateResult.cachedValue
    );
    result.originalValidity = evalStateResult.cachedValue.validity;
    result.originalErrorMessages = evalStateResult.cachedValue.errorMessages;

    return result;
  }

  private async evalInteraction<Input, View = unknown>(
    interactionData: InteractionData<Input>,
    executionContext: ExecutionContext<State, HandlerApi<State>>,
    evalStateResult: EvalStateResult<State>
  ) {
    const interactionCall: InteractionCall = this.getCallStack().addInteractionData(interactionData);
    const benchmark = Benchmark.measure();

    await executionContext.handler.initState(evalStateResult.state);

    const result = await executionContext.handler.handle<Input, View>(
      executionContext,
      evalStateResult,
      interactionData
    );

    interactionCall.update({
      cacheHit: false,
      outputState: this._evaluationOptions.stackTrace.saveState ? result.state : undefined,
      executionTime: benchmark.elapsed(true) as number,
      valid: result.type === 'ok',
      errorMessage: result.errorMessage,
      gasUsed: result.gasUsed
    });

    return result;
  }

  parent(): Contract | null {
    return this._parentContract;
  }

  callDepth(): number {
    return this._callDepth;
  }

  evaluationOptions(): EvaluationOptions {
    return this._evaluationOptions;
  }

  lastReadStateStats(): BenchmarkStats {
    return this._benchmarkStats;
  }

  async stateHash(state: State): Promise<string> {
    const jsonState = stringify(state);

    const hash = await Crypto.subtle.digest('SHA-256', Buffer.from(jsonState, 'utf-8'));

    return Buffer.from(hash).toString('hex');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- params can be anything
  async syncState(externalUrl: string, params?: any): Promise<Contract> {
    const { stateEvaluator } = this.warp;
    const response = await this._warpFetchWrapper
      .fetch(
        `${externalUrl}?${new URLSearchParams({
          id: this._contractTxId,
          ...params
        })}`
      )
      .then((res) => {
        return res.ok ? res.json() : Promise.reject(res);
      })
      .catch((error) => {
        if (error.body?.message) {
          this.logger.error(error.body.message);
        }
        throw new Error(`Unable to retrieve state. ${error.status}: ${error.body?.message}`);
      });

    await stateEvaluator.syncState<State>(this._contractTxId, response.sortKey, response.state, response.validity);

    return this;
  }

  async evolve(newSrcTxId: string, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null> {
    return await this.writeInteraction({ function: 'evolve', value: newSrcTxId }, options);
  }

  get rootSortKey(): string {
    return this._rootSortKey;
  }

  getRootEoEvaluator(): EvaluationOptionsEvaluator {
    const root = this.getRoot() as HandlerBasedContract<unknown>;
    return root._eoEvaluator;
  }

  isRoot(): boolean {
    return this._parentContract == null;
  }

  async getStorageValues(keys: string[]): Promise<SortKeyCacheResult<Map<string, unknown>>> {
    const lastCached = await this.warp.stateEvaluator.getCache().getLast(this.txId());
    if (lastCached == null) {
      return new SortKeyCacheResult<Map<string, unknown>>(null, new Map());
    }

    const storage = this.warp.kvStorageFactory(this.txId());
    const result: Map<string, unknown> = new Map();
    try {
      await storage.open();
      for (const key of keys) {
        const lastValue = await storage.getLessOrEqual(key, lastCached.sortKey);
        result.set(key, lastValue == null ? null : lastValue.cachedValue);
      }
      return new SortKeyCacheResult<Map<string, unknown>>(lastCached.sortKey, result);
    } finally {
      await storage.close();
    }
  }

  interactionState(): InteractionState {
    return this.getRoot()._interactionState;
  }

  getRoot(): HandlerBasedContract<unknown> {
    let result: Contract = this;
    while (!result.isRoot()) {
      result = result.parent();
    }

    return result as HandlerBasedContract<unknown>;
  }

  private async maybeSyncStateWithRemoteSource(
    remoteState: SortKeyCacheResult<EvalStateResult<State>>,
    upToSortKey: string,
    cachedState: SortKeyCacheResult<EvalStateResult<State>>
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>> {
    const { stateEvaluator } = this.warp;
    if (this.isStateHigherThanAndUpTo(remoteState, cachedState?.sortKey, upToSortKey)) {
      return await stateEvaluator.syncState<State>(
        this._contractTxId,
        remoteState.sortKey,
        remoteState.cachedValue.state,
        remoteState.cachedValue.validity
      );
    }
    return cachedState;
  }

  private isStateHigherThanAndUpTo(
    remoteState: SortKeyCacheResult<EvalStateResult<State>>,
    fromSortKey: string,
    upToSortKey: string
  ) {
    return (
      remoteState &&
      (!upToSortKey || upToSortKey >= remoteState.sortKey) &&
      (!fromSortKey || remoteState.sortKey > fromSortKey)
    );
  }

  setDREState(
    contractTxId: string,
    result: DREContractStatusResponse<State>
  ): SortKeyCacheResult<EvalStateResult<State>> {
    const dreCachedState = new SortKeyCacheResult(
      result.sortKey,
      new EvalStateResult(result.state, {}, result.errorMessages)
    );
    this.getRoot()._dreStates.set(contractTxId, dreCachedState);
    return dreCachedState;
  }

  getDreState(contractTxId: string): SortKeyCacheResult<EvalStateResult<State>> {
    return this.getRoot()._dreStates.get(contractTxId) as SortKeyCacheResult<EvalStateResult<State>>;
  }

  hasDreState(contractTxId: string): boolean {
    return this.getRoot()._dreStates.has(contractTxId);
  }

  // Call contract and verify if there are any internal writes:
  // 1. Evaluate current contract state
  // 2. Apply input as "dry-run" transaction
  // 3. Verify the callStack and search for any "internalWrites" transactions
  // 4. For each found "internalWrite" transaction - generate additional tag:
  // {name: 'InternalWrite', value: callingContractTxId}
  private async discoverInternalWrites<Input>(
    input: Input,
    tags: Tags,
    transfer: ArTransfer,
    strict: boolean,
    vrf: boolean
  ) {
    const handlerResult = await this.callContract(
      input,
      'write',
      undefined,
      undefined,
      tags,
      transfer,
      strict,
      vrf,
      false
    );

    if (strict && handlerResult.type !== 'ok') {
      throw Error('Cannot create interaction: ' + JSON.stringify(handlerResult.error || handlerResult.errorMessage));
    }
    const callStack: ContractCallRecord = this.getCallStack();
    const innerWrites = this._innerWritesEvaluator.eval(callStack);
    this.logger.debug('Input', input);
    this.logger.debug('Callstack', callStack.print());

    innerWrites.forEach((contractTxId) => {
      tags.push(new Tag(WARP_TAGS.INTERACT_WRITE, contractTxId));
    });

    this.logger.debug('Tags with inner calls', tags);
  }
}
