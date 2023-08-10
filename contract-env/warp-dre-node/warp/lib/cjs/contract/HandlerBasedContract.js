"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerBasedContract = void 0;
const safe_stable_stringify_1 = __importDefault(require("safe-stable-stringify"));
const SortKeyCache_1 = require("../cache/SortKeyCache");
const ContractCallRecord_1 = require("../core/ContractCallRecord");
const LexicographicalInteractionsSorter_1 = require("../core/modules/impl/LexicographicalInteractionsSorter");
const StateEvaluator_1 = require("../core/modules/StateEvaluator");
const KnownTags_1 = require("../core/KnownTags");
const create_interaction_tx_1 = require("../legacy/create-interaction-tx");
const Benchmark_1 = require("../logging/Benchmark");
const LoggerFactory_1 = require("../logging/LoggerFactory");
const Evolve_1 = require("../plugins/Evolve");
const ArweaveWrapper_1 = require("../utils/ArweaveWrapper");
const utils_1 = require("../utils/utils");
const CreateContract_1 = require("./deploy/CreateContract");
const InnerWritesEvaluator_1 = require("./InnerWritesEvaluator");
const Signature_1 = require("./Signature");
const EvaluationOptionsEvaluator_1 = require("./EvaluationOptionsEvaluator");
const WarpFetchWrapper_1 = require("../core/WarpFetchWrapper");
const async_mutex_1 = require("async-mutex");
const arweave_types_1 = require("../utils/types/arweave-types");
const ContractInteractionState_1 = require("./states/ContractInteractionState");
const warp_isomorphic_1 = require("warp-isomorphic");
const arweave_1 = __importDefault(require("arweave"));
const warp_arbundles_1 = require("warp-arbundles");
/**
 * An implementation of {@link Contract} that is backwards compatible with current style
 * of writing SW contracts (ie. using the "handle" function).
 *
 * It requires {@link ExecutorFactory} that is using {@link HandlerApi} generic type.
 */
class HandlerBasedContract {
    constructor(_contractTxId, warp, _parentContract = null, _innerCallData = null) {
        var _a, _b;
        this._contractTxId = _contractTxId;
        this.warp = warp;
        this._parentContract = _parentContract;
        this._innerCallData = _innerCallData;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('HandlerBasedContract');
        // TODO: refactor: extract execution context logic to a separate class
        this.ecLogger = LoggerFactory_1.LoggerFactory.INST.create('ExecutionContext');
        this._innerWritesEvaluator = new InnerWritesEvaluator_1.InnerWritesEvaluator();
        this._mutex = new async_mutex_1.Mutex();
        this._benchmarkStats = null;
        this._children = [];
        this._dreStates = new Map();
        this.waitForConfirmation = this.waitForConfirmation.bind(this);
        this._arweaveWrapper = new ArweaveWrapper_1.ArweaveWrapper(warp);
        this._sorter = new LexicographicalInteractionsSorter_1.LexicographicalInteractionsSorter(warp.arweave);
        if (_parentContract != null) {
            this._evaluationOptions = this.getRoot().evaluationOptions();
            this._callDepth = _parentContract.callDepth() + 1;
            const callingInteraction = _parentContract
                .getCallStack()
                .getInteraction(_innerCallData.callingInteraction.id);
            if (this._callDepth > this._evaluationOptions.maxCallDepth) {
                throw new Error(`Max call depth of ${this._evaluationOptions.maxCallDepth} has been exceeded for interaction ${JSON.stringify(callingInteraction.interactionInput)}`);
            }
            this.logger.debug('Calling interaction', {
                id: _innerCallData.callingInteraction.id,
                sortKey: _innerCallData.callingInteraction.sortKey,
                type: _innerCallData.callType
            });
            // if you're reading a state of the contract, on which you've just made a write - you're doing it wrong.
            // the current state of the callee contract is always in the result of an internal write.
            // following is a protection against naughty developers who might be doing such crazy things ;-)
            if (((_b = (_a = callingInteraction.interactionInput) === null || _a === void 0 ? void 0 : _a.foreignContractCalls[_contractTxId]) === null || _b === void 0 ? void 0 : _b.innerCallType) === 'write' &&
                _innerCallData.callType === 'read') {
                throw new Error('Calling a readContractState after performing an inner write is wrong - instead use a state from the result of an internal write.');
            }
            const callStack = new ContractCallRecord_1.ContractCallRecord(_contractTxId, this._callDepth, _innerCallData === null || _innerCallData === void 0 ? void 0 : _innerCallData.callType);
            callingInteraction.interactionInput.foreignContractCalls[_contractTxId] = callStack;
            this._callStack = callStack;
            this._rootSortKey = _parentContract.rootSortKey;
            _parentContract._children.push(this);
        }
        else {
            this._callDepth = 0;
            this._callStack = new ContractCallRecord_1.ContractCallRecord(_contractTxId, 0);
            this._rootSortKey = null;
            this._evaluationOptions = new StateEvaluator_1.DefaultEvaluationOptions();
            this._children = [];
            this._interactionState = new ContractInteractionState_1.ContractInteractionState(warp);
        }
        this.getCallStack = this.getCallStack.bind(this);
        this._warpFetchWrapper = new WarpFetchWrapper_1.WarpFetchWrapper(this.warp);
    }
    async readState(sortKeyOrBlockHeight, caller, interactions) {
        var _a, _b, _c;
        this.logger.info('Read state for', {
            contractTxId: this._contractTxId,
            sortKeyOrBlockHeight
        });
        if (!this.isRoot() && sortKeyOrBlockHeight == null) {
            throw new Error('SortKey MUST be always set for non-root contract calls');
        }
        const { stateEvaluator } = this.warp;
        const sortKey = typeof sortKeyOrBlockHeight == 'number'
            ? this._sorter.generateLastSortKey(sortKeyOrBlockHeight)
            : sortKeyOrBlockHeight;
        if (sortKey && !this.isRoot() && this.interactionState().has(this.txId())) {
            const result = this.interactionState().get(this.txId());
            return new SortKeyCache_1.SortKeyCacheResult(sortKey, result);
        }
        // TODO: not sure if we should synchronize on a contract instance or contractTxId
        // in the latter case, the warp instance should keep a map contractTxId -> mutex
        const releaseMutex = await this._mutex.acquire();
        try {
            const initBenchmark = Benchmark_1.Benchmark.measure();
            this.maybeResetRootContract();
            const executionContext = await this.createExecutionContext(this._contractTxId, sortKey, false, interactions);
            this.logger.info('Execution Context', {
                srcTxId: (_a = executionContext.contractDefinition) === null || _a === void 0 ? void 0 : _a.srcTxId,
                missingInteractions: (_b = executionContext.sortedInteractions) === null || _b === void 0 ? void 0 : _b.length,
                cachedSortKey: (_c = executionContext.cachedState) === null || _c === void 0 ? void 0 : _c.sortKey
            });
            initBenchmark.stop();
            const stateBenchmark = Benchmark_1.Benchmark.measure();
            const result = await stateEvaluator.eval(executionContext);
            stateBenchmark.stop();
            const total = initBenchmark.elapsed(true) + stateBenchmark.elapsed(true);
            this._benchmarkStats = {
                gatewayCommunication: initBenchmark.elapsed(true),
                stateEvaluation: stateBenchmark.elapsed(true),
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
        }
        finally {
            releaseMutex();
        }
    }
    async readStateFor(sortKey, interactions) {
        return this.readState(sortKey, undefined, interactions);
    }
    async viewState(input, tags = [], transfer = CreateContract_1.emptyTransfer, caller) {
        this.logger.info('View state for', this._contractTxId);
        return await this.callContract(input, 'view', caller, undefined, tags, transfer);
    }
    async viewStateForTx(input, interactionTx) {
        this.logger.info(`View state for ${this._contractTxId}`);
        return await this.doApplyInputOnTx(input, interactionTx, 'view');
    }
    async dryWrite(input, caller, tags, transfer, vrf) {
        this.logger.info('Dry-write for', this._contractTxId);
        return await this.callContract(input, 'write', caller, undefined, tags, transfer, undefined, vrf);
    }
    async applyInput(input, transaction) {
        this.logger.info(`Apply-input from transaction ${transaction.id} for ${this._contractTxId}`);
        return await this.doApplyInputOnTx(input, transaction, 'write');
    }
    async writeInteraction(input, options) {
        this.logger.info('Write interaction', { input, options });
        if (!this._signature) {
            throw new Error("Wallet not connected. Use 'connect' method first.");
        }
        const { arweave, interactionsLoader, environment } = this.warp;
        // we're calling this to verify whether proper env is used for this contract
        // (e.g. test env for test contract)
        await this.warp.definitionLoader.load(this._contractTxId);
        const effectiveTags = (options === null || options === void 0 ? void 0 : options.tags) || [];
        const effectiveTransfer = (options === null || options === void 0 ? void 0 : options.transfer) || CreateContract_1.emptyTransfer;
        const effectiveStrict = (options === null || options === void 0 ? void 0 : options.strict) === true;
        const effectiveVrf = (options === null || options === void 0 ? void 0 : options.vrf) === true;
        const effectiveDisableBundling = (options === null || options === void 0 ? void 0 : options.disableBundling) === true;
        const effectiveReward = options === null || options === void 0 ? void 0 : options.reward;
        const bundleInteraction = interactionsLoader.type() == 'warp' && !effectiveDisableBundling;
        this._signature.checkNonArweaveSigningAvailability(bundleInteraction);
        this._signature.checkBundlerSignerAvailability(bundleInteraction);
        if (bundleInteraction &&
            effectiveTransfer.target != CreateContract_1.emptyTransfer.target &&
            effectiveTransfer.winstonQty != CreateContract_1.emptyTransfer.winstonQty) {
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
        }
        else {
            const interactionTx = await this.createInteraction(input, effectiveTags, effectiveTransfer, effectiveStrict, false, effectiveVrf && environment !== 'mainnet', effectiveReward);
            const response = await arweave.transactions.post(interactionTx);
            if (response.status !== 200) {
                this.logger.error('Error while posting transaction', response);
                return null;
            }
            if (this._evaluationOptions.waitForConfirmation) {
                this.logger.info('Waiting for confirmation of', interactionTx.id);
                const benchmark = Benchmark_1.Benchmark.measure();
                await this.waitForConfirmation(interactionTx.id);
                this.logger.info('Transaction confirmed after', benchmark.elapsed());
            }
            if (this.warp.environment == 'local' && this._evaluationOptions.mineArLocalBlocks) {
                await this.warp.testing.mineBlock();
            }
            return { originalTxId: interactionTx.id };
        }
    }
    async bundleInteraction(input, options) {
        this.logger.info('Bundle interaction input', input);
        const interactionDataItem = await this.createInteractionDataItem(input, options.tags, CreateContract_1.emptyTransfer, options.strict, options.vrf);
        const response = this._warpFetchWrapper.fetch(`${(0, utils_1.stripTrailingSlash)(this._evaluationOptions.sequencerUrl)}/gateway/v2/sequencer/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                Accept: 'application/json'
            },
            body: interactionDataItem.getRaw()
        });
        const dataItemId = await interactionDataItem.id;
        return {
            bundlrResponse: await (0, utils_1.getJsonResponse)(response),
            originalTxId: dataItemId
        };
    }
    async createInteractionDataItem(input, tags, transfer, strict, vrf = false) {
        var _a;
        if (this._evaluationOptions.internalWrites) {
            // it modifies tags
            await this.discoverInternalWrites(input, tags, transfer, strict, vrf);
        }
        if (vrf) {
            tags.push(new arweave_types_1.Tag(KnownTags_1.WARP_TAGS.REQUEST_VRF, 'true'));
        }
        const interactionTags = (0, create_interaction_tx_1.createInteractionTagsList)(this._contractTxId, input, this.warp.environment === 'testnet', tags);
        if ((0, warp_arbundles_1.tagsExceedLimit)(interactionTags)) {
            throw new Error(`Interaction tags exceed limit of 4096 bytes.`);
        }
        const data = Math.random().toString().slice(-4);
        const bundlerSigner = this._signature.bundlerSigner;
        if (!bundlerSigner) {
            throw new Error(`Signer not set correctly. If you connect wallet through 'use_wallet', please remember that it only works when bundling is disabled.`);
        }
        let interactionDataItem;
        if ((0, utils_1.isBrowser)() && ((_a = bundlerSigner.signer) === null || _a === void 0 ? void 0 : _a.signDataItem)) {
            interactionDataItem = await bundlerSigner.signDataItem(data, interactionTags);
        }
        else {
            interactionDataItem = (0, warp_arbundles_1.createData)(data, bundlerSigner, { tags: interactionTags });
            await interactionDataItem.sign(bundlerSigner);
        }
        if (!this._evaluationOptions.internalWrites && strict) {
            await this.checkInteractionInStrictMode(interactionDataItem.owner, input, tags, transfer, strict, vrf);
        }
        return interactionDataItem;
    }
    async createInteraction(input, tags, transfer, strict, bundle = false, vrf = false, reward) {
        if (this._evaluationOptions.internalWrites) {
            // it modifies tags
            await this.discoverInternalWrites(input, tags, transfer, strict, vrf);
        }
        if (vrf) {
            tags.push(new arweave_types_1.Tag(KnownTags_1.WARP_TAGS.REQUEST_VRF, 'true'));
        }
        const interactionTx = await (0, create_interaction_tx_1.createInteractionTx)(this.warp.arweave, this._signature.signer, this._contractTxId, input, tags, transfer.target, transfer.winstonQty, bundle, this.warp.environment === 'testnet', reward);
        if (!this._evaluationOptions.internalWrites && strict) {
            await this.checkInteractionInStrictMode(interactionTx.owner, input, tags, transfer, strict, vrf);
        }
        return interactionTx;
    }
    async checkInteractionInStrictMode(owner, input, tags, transfer, strict, vrf) {
        const { arweave } = this.warp;
        const caller = this._signature.type == 'arweave' ? await arweave.wallets.ownerToAddress(owner) : owner;
        const handlerResult = await this.callContract(input, 'write', caller, undefined, tags, transfer, strict, vrf);
        if (handlerResult.type !== 'ok') {
            throw Error('Cannot create interaction: ' + JSON.stringify(handlerResult.error || handlerResult.errorMessage));
        }
    }
    txId() {
        return this._contractTxId;
    }
    getCallStack() {
        return this._callStack;
    }
    connect(signature) {
        this._signature = new Signature_1.Signature(this.warp, signature);
        return this;
    }
    setEvaluationOptions(options) {
        if (!this.isRoot()) {
            throw new Error('Evaluation options can be set only for the root contract');
        }
        this._evaluationOptions = {
            ...this._evaluationOptions,
            ...options
        };
        return this;
    }
    async waitForConfirmation(transactionId) {
        const { arweave } = this.warp;
        const status = await arweave.transactions.getStatus(transactionId);
        if (status.confirmed === null) {
            this.logger.info(`Transaction ${transactionId} not yet confirmed. Waiting another 20 seconds before next check.`);
            await (0, utils_1.sleep)(20000);
            return this.waitForConfirmation(transactionId);
        }
        else {
            this.logger.info(`Transaction ${transactionId} confirmed`, status);
            return status;
        }
    }
    async createExecutionContext(contractTxId, upToSortKey, forceDefinitionLoad = false, interactions) {
        var _a, _b, _c, _d;
        const { definitionLoader, interactionsLoader, stateEvaluator } = this.warp;
        const benchmark = Benchmark_1.Benchmark.measure();
        let cachedState = await stateEvaluator.latestAvailableState(contractTxId, upToSortKey);
        this.logger.debug('cache lookup', benchmark.elapsed());
        benchmark.reset();
        const evolvedSrcTxId = Evolve_1.Evolve.evolvedSrcTxId((_a = cachedState === null || cachedState === void 0 ? void 0 : cachedState.cachedValue) === null || _a === void 0 ? void 0 : _a.state);
        let handler, contractDefinition, contractEvaluationOptions, remoteState;
        let sortedInteractions = interactions || [];
        this.logger.debug('Cached state', cachedState, upToSortKey);
        if (cachedState && cachedState.sortKey == upToSortKey) {
            this.logger.debug('State fully cached, not loading interactions.');
            if (forceDefinitionLoad || evolvedSrcTxId || (interactions === null || interactions === void 0 ? void 0 : interactions.length)) {
                contractDefinition = await definitionLoader.load(contractTxId, evolvedSrcTxId);
                if (interactions === null || interactions === void 0 ? void 0 : interactions.length) {
                    sortedInteractions = (await this._sorter.sort(interactions.map((i) => ({ node: i, cursor: null })))).map((i) => i.node);
                }
            }
        }
        else {
            // if we want to apply some 'external' interactions on top of the state cached at given sort key
            // AND we don't have the state cached at the exact requested sort key - throw.
            // NOTE: this feature is used by the D.R.E. nodes.
            if (interactions === null || interactions === void 0 ? void 0 : interactions.length) {
                throw new Error(`Cannot apply requested interactions at ${upToSortKey}`);
            }
            contractDefinition = await definitionLoader.load(contractTxId, evolvedSrcTxId);
            contractEvaluationOptions = this.resolveEvaluationOptions((_b = contractDefinition.manifest) === null || _b === void 0 ? void 0 : _b.evaluationOptions);
            if (contractEvaluationOptions.remoteStateSyncEnabled && !contractEvaluationOptions.useKVStorage) {
                remoteState = await this.getRemoteContractState(contractTxId);
                cachedState = await this.maybeSyncStateWithRemoteSource(remoteState, upToSortKey, cachedState);
                const maybeEvolvedSrcTxId = Evolve_1.Evolve.evolvedSrcTxId((_c = cachedState === null || cachedState === void 0 ? void 0 : cachedState.cachedValue) === null || _c === void 0 ? void 0 : _c.state);
                if (maybeEvolvedSrcTxId && maybeEvolvedSrcTxId !== contractDefinition.srcTxId) {
                    // even though the state will be synced, the CacheableStateEvaluator will
                    // still try to init it in the WASM module (https://github.com/warp-contracts/warp/issues/372)
                    // if the state struct definition has changed via evolve - there is a risk of panic in Rust.
                    // that's why the contract definition has to be updated.
                    contractDefinition = await definitionLoader.load(contractTxId, maybeEvolvedSrcTxId);
                }
            }
            if (!remoteState && sortedInteractions.length == 0) {
                sortedInteractions = await interactionsLoader.load(contractTxId, cachedState === null || cachedState === void 0 ? void 0 : cachedState.sortKey, this.getToSortKey(upToSortKey), contractEvaluationOptions);
            }
            // we still need to return only interactions up to original "upToSortKey"
            if (cachedState === null || cachedState === void 0 ? void 0 : cachedState.sortKey) {
                sortedInteractions = sortedInteractions.filter((i) => i.sortKey.localeCompare(cachedState === null || cachedState === void 0 ? void 0 : cachedState.sortKey) > 0);
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
                contractEvaluationOptions = this.resolveEvaluationOptions((_d = contractDefinition.manifest) === null || _d === void 0 ? void 0 : _d.evaluationOptions);
            }
            this.ecLogger.debug(`Evaluation options ${contractTxId}:`, contractEvaluationOptions);
            handler = (await this.warp.executorFactory.create(contractDefinition, contractEvaluationOptions, this.warp, this.interactionState()));
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
    resolveEvaluationOptions(rootManifestEvalOptions) {
        if (this.isRoot()) {
            this._eoEvaluator = new EvaluationOptionsEvaluator_1.EvaluationOptionsEvaluator(this.evaluationOptions(), rootManifestEvalOptions);
            return this._eoEvaluator.rootOptions;
        }
        return this.getRootEoEvaluator().forForeignContract(rootManifestEvalOptions);
    }
    async getRemoteContractState(contractId) {
        if (this.hasDreState(contractId)) {
            return this.getDreState(contractId);
        }
        else {
            const dreResponse = await this.fetchRemoteContractState(contractId);
            if (dreResponse != null) {
                return this.setDREState(contractId, dreResponse);
            }
            return null;
        }
    }
    async fetchRemoteContractState(contractId) {
        return (0, utils_1.getJsonResponse)(this._warpFetchWrapper.fetch(`${this._evaluationOptions.remoteStateSyncSource}?id=${contractId}&events=false`));
    }
    getToSortKey(upToSortKey) {
        var _a;
        if ((_a = this._parentContract) === null || _a === void 0 ? void 0 : _a.rootSortKey) {
            if (!upToSortKey) {
                return this._parentContract.rootSortKey;
            }
            return this._parentContract.rootSortKey.localeCompare(upToSortKey) > 0
                ? this._parentContract.rootSortKey
                : upToSortKey;
        }
        else {
            return upToSortKey;
        }
    }
    async createExecutionContextFromTx(contractTxId, transaction) {
        const caller = transaction.owner.address;
        const sortKey = transaction.sortKey;
        const baseContext = await this.createExecutionContext(contractTxId, sortKey, true);
        return {
            ...baseContext,
            caller
        };
    }
    maybeResetRootContract() {
        if (this.isRoot()) {
            this.logger.debug('Clearing call stack for the root contract');
            this._callStack = new ContractCallRecord_1.ContractCallRecord(this.txId(), 0);
            this._rootSortKey = null;
            this.warp.interactionsLoader.clearCache();
            this._children = [];
            this._interactionState = new ContractInteractionState_1.ContractInteractionState(this.warp);
            this._dreStates = new Map();
        }
    }
    async callContract(input, interactionType, caller, sortKey, tags = [], transfer = CreateContract_1.emptyTransfer, strict = false, vrf = false, sign = true) {
        var _a;
        this.logger.info('Call contract input', input);
        this.maybeResetRootContract();
        if (!this._signature) {
            this.logger.warn('Wallet not set.');
        }
        const { arweave, stateEvaluator } = this.warp;
        // create execution context
        let executionContext = await this.createExecutionContext(this._contractTxId, sortKey, true);
        const currentBlockData = this.warp.environment == 'mainnet' ? await this._arweaveWrapper.warpGwBlock() : await arweave.blocks.getCurrent();
        // add caller info to execution context
        let effectiveCaller;
        if (caller) {
            effectiveCaller = caller;
        }
        else if (this._signature) {
            effectiveCaller = await this._signature.getAddress();
        }
        else {
            effectiveCaller = '';
        }
        this.logger.info('effectiveCaller', effectiveCaller);
        executionContext = {
            ...executionContext,
            caller: effectiveCaller
        };
        // eval current state
        const evalStateResult = await stateEvaluator.eval(executionContext);
        this.logger.info('Current state', evalStateResult.cachedValue.state);
        // create interaction transaction
        const interaction = {
            input,
            caller: executionContext.caller,
            interactionType
        };
        this.logger.debug('interaction', interaction);
        const tx = await (0, create_interaction_tx_1.createInteractionTx)(arweave, sign ? (_a = this._signature) === null || _a === void 0 ? void 0 : _a.signer : undefined, this._contractTxId, input, tags, transfer.target, transfer.winstonQty, true, this.warp.environment === 'testnet');
        const dummyTx = (0, create_interaction_tx_1.createDummyTx)(tx, executionContext.caller, currentBlockData);
        this.logger.debug('Creating sortKey for', {
            blockId: dummyTx.block.id,
            id: dummyTx.id,
            height: dummyTx.block.height
        });
        dummyTx.sortKey = await this._sorter.createSortKey(dummyTx.block.id, dummyTx.id, dummyTx.block.height, true);
        dummyTx.strict = strict;
        if (vrf) {
            arweave_1.default.utils;
            const vrfPlugin = this.warp.maybeLoadPlugin('vrf');
            if (vrfPlugin) {
                dummyTx.vrf = vrfPlugin.process().generateMockVrf(dummyTx.sortKey);
            }
            else {
                this.logger.warn('Cannot generate mock vrf for interaction - no "warp-contracts-plugin-vrf" attached!');
            }
        }
        const handleResult = await this.evalInteraction({
            interaction,
            interactionTx: dummyTx
        }, executionContext, evalStateResult.cachedValue);
        if (handleResult.type !== 'ok') {
            this.logger.fatal('Error while interacting with contract', {
                type: handleResult.type,
                error: handleResult.errorMessage
            });
        }
        return handleResult;
    }
    async doApplyInputOnTx(input, interactionTx, interactionType) {
        this.maybeResetRootContract();
        let evalStateResult;
        const executionContext = await this.createExecutionContextFromTx(this._contractTxId, interactionTx);
        if (!this.isRoot() && this.interactionState().has(this.txId())) {
            evalStateResult = new SortKeyCache_1.SortKeyCacheResult(interactionTx.sortKey, this.interactionState().get(this.txId()));
        }
        else {
            evalStateResult = await this.warp.stateEvaluator.eval(executionContext);
            this.interactionState().update(this.txId(), evalStateResult.cachedValue);
        }
        this.logger.debug('callContractForTx - evalStateResult', {
            result: evalStateResult.cachedValue.state,
            txId: this._contractTxId
        });
        const interaction = {
            input,
            caller: this._parentContract.txId(),
            interactionType
        };
        const interactionData = {
            interaction,
            interactionTx
        };
        const result = await this.evalInteraction(interactionData, executionContext, evalStateResult.cachedValue);
        result.originalValidity = evalStateResult.cachedValue.validity;
        result.originalErrorMessages = evalStateResult.cachedValue.errorMessages;
        return result;
    }
    async evalInteraction(interactionData, executionContext, evalStateResult) {
        const interactionCall = this.getCallStack().addInteractionData(interactionData);
        const benchmark = Benchmark_1.Benchmark.measure();
        await executionContext.handler.initState(evalStateResult.state);
        const result = await executionContext.handler.handle(executionContext, evalStateResult, interactionData);
        interactionCall.update({
            cacheHit: false,
            outputState: this._evaluationOptions.stackTrace.saveState ? result.state : undefined,
            executionTime: benchmark.elapsed(true),
            valid: result.type === 'ok',
            errorMessage: result.errorMessage,
            gasUsed: result.gasUsed
        });
        return result;
    }
    parent() {
        return this._parentContract;
    }
    callDepth() {
        return this._callDepth;
    }
    evaluationOptions() {
        return this._evaluationOptions;
    }
    lastReadStateStats() {
        return this._benchmarkStats;
    }
    async stateHash(state) {
        const jsonState = (0, safe_stable_stringify_1.default)(state);
        const hash = await warp_isomorphic_1.Crypto.subtle.digest('SHA-256', Buffer.from(jsonState, 'utf-8'));
        return Buffer.from(hash).toString('hex');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- params can be anything
    async syncState(externalUrl, params) {
        const { stateEvaluator } = this.warp;
        const response = await this._warpFetchWrapper
            .fetch(`${externalUrl}?${new URLSearchParams({
            id: this._contractTxId,
            ...params
        })}`)
            .then((res) => {
            return res.ok ? res.json() : Promise.reject(res);
        })
            .catch((error) => {
            var _a, _b;
            if ((_a = error.body) === null || _a === void 0 ? void 0 : _a.message) {
                this.logger.error(error.body.message);
            }
            throw new Error(`Unable to retrieve state. ${error.status}: ${(_b = error.body) === null || _b === void 0 ? void 0 : _b.message}`);
        });
        await stateEvaluator.syncState(this._contractTxId, response.sortKey, response.state, response.validity);
        return this;
    }
    async evolve(newSrcTxId, options) {
        return await this.writeInteraction({ function: 'evolve', value: newSrcTxId }, options);
    }
    get rootSortKey() {
        return this._rootSortKey;
    }
    getRootEoEvaluator() {
        const root = this.getRoot();
        return root._eoEvaluator;
    }
    isRoot() {
        return this._parentContract == null;
    }
    async getStorageValues(keys) {
        const lastCached = await this.warp.stateEvaluator.getCache().getLast(this.txId());
        if (lastCached == null) {
            return new SortKeyCache_1.SortKeyCacheResult(null, new Map());
        }
        const storage = this.warp.kvStorageFactory(this.txId());
        const result = new Map();
        try {
            await storage.open();
            for (const key of keys) {
                const lastValue = await storage.getLessOrEqual(key, lastCached.sortKey);
                result.set(key, lastValue == null ? null : lastValue.cachedValue);
            }
            return new SortKeyCache_1.SortKeyCacheResult(lastCached.sortKey, result);
        }
        finally {
            await storage.close();
        }
    }
    interactionState() {
        return this.getRoot()._interactionState;
    }
    getRoot() {
        let result = this;
        while (!result.isRoot()) {
            result = result.parent();
        }
        return result;
    }
    async maybeSyncStateWithRemoteSource(remoteState, upToSortKey, cachedState) {
        const { stateEvaluator } = this.warp;
        if (this.isStateHigherThanAndUpTo(remoteState, cachedState === null || cachedState === void 0 ? void 0 : cachedState.sortKey, upToSortKey)) {
            return await stateEvaluator.syncState(this._contractTxId, remoteState.sortKey, remoteState.cachedValue.state, remoteState.cachedValue.validity);
        }
        return cachedState;
    }
    isStateHigherThanAndUpTo(remoteState, fromSortKey, upToSortKey) {
        return (remoteState &&
            (!upToSortKey || upToSortKey >= remoteState.sortKey) &&
            (!fromSortKey || remoteState.sortKey > fromSortKey));
    }
    setDREState(contractTxId, result) {
        const dreCachedState = new SortKeyCache_1.SortKeyCacheResult(result.sortKey, new StateEvaluator_1.EvalStateResult(result.state, {}, result.errorMessages));
        this.getRoot()._dreStates.set(contractTxId, dreCachedState);
        return dreCachedState;
    }
    getDreState(contractTxId) {
        return this.getRoot()._dreStates.get(contractTxId);
    }
    hasDreState(contractTxId) {
        return this.getRoot()._dreStates.has(contractTxId);
    }
    // Call contract and verify if there are any internal writes:
    // 1. Evaluate current contract state
    // 2. Apply input as "dry-run" transaction
    // 3. Verify the callStack and search for any "internalWrites" transactions
    // 4. For each found "internalWrite" transaction - generate additional tag:
    // {name: 'InternalWrite', value: callingContractTxId}
    async discoverInternalWrites(input, tags, transfer, strict, vrf) {
        const handlerResult = await this.callContract(input, 'write', undefined, undefined, tags, transfer, strict, vrf, false);
        if (strict && handlerResult.type !== 'ok') {
            throw Error('Cannot create interaction: ' + JSON.stringify(handlerResult.error || handlerResult.errorMessage));
        }
        const callStack = this.getCallStack();
        const innerWrites = this._innerWritesEvaluator.eval(callStack);
        this.logger.debug('Input', input);
        this.logger.debug('Callstack', callStack.print());
        innerWrites.forEach((contractTxId) => {
            tags.push(new arweave_types_1.Tag(KnownTags_1.WARP_TAGS.INTERACT_WRITE, contractTxId));
        });
        this.logger.debug('Tags with inner calls', tags);
    }
}
exports.HandlerBasedContract = HandlerBasedContract;
//# sourceMappingURL=HandlerBasedContract.js.map