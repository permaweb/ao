"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultStateEvaluator = void 0;
const SortKeyCache_1 = require("../../../cache/SortKeyCache");
const Benchmark_1 = require("../../../logging/Benchmark");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const utils_1 = require("../../../utils/utils");
const StateEvaluator_1 = require("../StateEvaluator");
const TagsParser_1 = require("./TagsParser");
/**
 * This class contains the base functionality of evaluating the contracts state - according
 * to the SmartWeave protocol.
 * Marked as abstract - as without help of any cache - the evaluation in real-life applications
 * would be really slow - so using this class without any caching ({@link CacheableStateEvaluator})
 * mechanism built on top makes no sense.
 */
class DefaultStateEvaluator {
    constructor(arweave, executionContextModifiers = []) {
        this.arweave = arweave;
        this.executionContextModifiers = executionContextModifiers;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('DefaultStateEvaluator');
        this.tagsParser = new TagsParser_1.TagsParser();
    }
    async eval(executionContext) {
        return this.doReadState(executionContext.sortedInteractions, new StateEvaluator_1.EvalStateResult(executionContext.contractDefinition.initState, {}, {}), executionContext);
    }
    async doReadState(missingInteractions, baseState, executionContext) {
        var _a;
        const { ignoreExceptions, stackTrace, internalWrites } = executionContext.evaluationOptions;
        const { contract, contractDefinition, sortedInteractions, warp } = executionContext;
        let currentState = baseState.state;
        let currentSortKey = null;
        const validity = baseState.validity;
        const errorMessages = baseState.errorMessages;
        let executionResult = null;
        // TODO: opt - reuse wasm handlers
        executionContext === null || executionContext === void 0 ? void 0 : executionContext.handler.initState(currentState);
        const depth = executionContext.contract.callDepth();
        this.logger.debug(`${(0, utils_1.indent)(depth)}Evaluating state for ${contractDefinition.txId} [${missingInteractions.length} non-cached of ${sortedInteractions.length} all]`);
        let errorMessage = null;
        let lastConfirmedTxState = null;
        const missingInteractionsLength = missingInteractions.length;
        const evmSignatureVerificationPlugin = warp.maybeLoadPlugin('evm-signature-verification');
        const progressPlugin = warp.maybeLoadPlugin('evaluation-progress');
        const vrfPlugin = warp.maybeLoadPlugin('vrf');
        let shouldBreakAfterEvolve = false;
        for (let i = 0; i < missingInteractionsLength; i++) {
            if (shouldBreakAfterEvolve) {
                break;
            }
            contract
                .interactionState()
                .setInitial(contract.txId(), new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages));
            const missingInteraction = missingInteractions[i];
            const singleInteractionBenchmark = Benchmark_1.Benchmark.measure();
            currentSortKey = missingInteraction.sortKey;
            if (missingInteraction.vrf) {
                if (!vrfPlugin) {
                    this.logger.warn('Cannot verify vrf for interaction - no "warp-contracts-plugin-vrf" attached!');
                }
                else {
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
                }
                catch (e) {
                    this.logger.error(e);
                    continue;
                }
            }
            this.logger.debug(`${(0, utils_1.indent)(depth)}[${contractDefinition.txId}][${missingInteraction.id}][${missingInteraction.block.height}]: ${missingInteractions.indexOf(missingInteraction) + 1}/${missingInteractions.length} [of all:${sortedInteractions.length}]`);
            const isInteractWrite = this.tagsParser.isInteractWrite(missingInteraction, contractDefinition.txId);
            // other contract makes write ("writing contract") on THIS contract
            if (isInteractWrite && internalWrites) {
                // evaluating txId of the contract that is writing on THIS contract
                const writingContractTxId = this.tagsParser.getContractTag(missingInteraction);
                this.logger.debug(`${(0, utils_1.indent)(depth)}Internal Write - Loading writing contract`, writingContractTxId);
                const interactionCall = contract
                    .getCallStack()
                    .addInteractionData({ interaction: null, interactionTx: missingInteraction });
                // creating a Contract instance for the "writing" contract
                const writingContract = warp.contract(writingContractTxId, executionContext.contract, {
                    callingInteraction: missingInteraction,
                    callType: 'read'
                });
                this.logger.debug(`${(0, utils_1.indent)(depth)}Reading state of the calling contract at`, missingInteraction.sortKey);
                /**
                 Reading the state of the writing contract.
                 This in turn will cause the state of THIS contract to be
                 updated in uncommitted state
                 */
                let newState = null;
                try {
                    await writingContract.readState(missingInteraction.sortKey);
                    newState = contract.interactionState().get(contract.txId());
                }
                catch (e) {
                    if (e.name == 'ContractError' && e.subtype == 'unsafeClientSkip') {
                        this.logger.warn('Skipping unsafe contract in internal write');
                        errorMessages[missingInteraction.id] = e;
                        if (canBeCached(missingInteraction)) {
                            const toCache = new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages);
                            lastConfirmedTxState = {
                                tx: missingInteraction,
                                state: toCache
                            };
                        }
                    }
                    else {
                        throw e;
                    }
                }
                if (newState !== null) {
                    currentState = newState.state;
                    // we need to update the state in the wasm module
                    // TODO: opt - reuse wasm handlers...
                    executionContext === null || executionContext === void 0 ? void 0 : executionContext.handler.initState(currentState);
                    validity[missingInteraction.id] = newState.validity[missingInteraction.id];
                    if ((_a = newState.errorMessages) === null || _a === void 0 ? void 0 : _a[missingInteraction.id]) {
                        errorMessages[missingInteraction.id] = newState.errorMessages[missingInteraction.id];
                    }
                    const toCache = new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages);
                    if (canBeCached(missingInteraction)) {
                        lastConfirmedTxState = {
                            tx: missingInteraction,
                            state: toCache
                        };
                    }
                }
                else {
                    validity[missingInteraction.id] = false;
                }
                interactionCall.update({
                    cacheHit: false,
                    outputState: stackTrace.saveState ? currentState : undefined,
                    executionTime: singleInteractionBenchmark.elapsed(true),
                    valid: validity[missingInteraction.id],
                    errorMessage: errorMessage,
                    gasUsed: 0 // TODO...
                });
            }
            else {
                // "direct" interaction with this contract - "standard" processing
                const inputTag = this.tagsParser.getInputTag(missingInteraction, executionContext.contractDefinition.txId);
                if (!inputTag) {
                    this.logger.error(`${(0, utils_1.indent)(depth)}Skipping tx - Input tag not found for ${missingInteraction.id}`);
                    continue;
                }
                const input = this.parseInput(inputTag);
                if (!input) {
                    this.logger.error(`${(0, utils_1.indent)(depth)}Skipping tx - invalid Input tag - ${missingInteraction.id}`);
                    continue;
                }
                const interaction = {
                    input,
                    caller: missingInteraction.owner.address,
                    interactionType: 'write'
                };
                const interactionData = {
                    interaction,
                    interactionTx: missingInteraction
                };
                const interactionCall = contract.getCallStack().addInteractionData(interactionData);
                const result = await executionContext.handler.handle(executionContext, new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages), interactionData);
                errorMessage = result.errorMessage;
                if (result.type !== 'ok') {
                    errorMessages[missingInteraction.id] = errorMessage;
                }
                this.logResult(result, missingInteraction, executionContext);
                this.logger.debug(`${(0, utils_1.indent)(depth)}Interaction evaluation`, singleInteractionBenchmark.elapsed());
                interactionCall.update({
                    cacheHit: false,
                    outputState: stackTrace.saveState ? currentState : undefined,
                    executionTime: singleInteractionBenchmark.elapsed(true),
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
                const toCache = new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages, executionResult);
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
                    lastInteractionProcessingTime: singleInteractionBenchmark.elapsed()
                });
            }
            try {
                for (const { modify } of this.executionContextModifiers) {
                    executionContext = await modify(currentState, executionContext);
                }
            }
            catch (e) {
                if (e.name == 'ContractError' && e.subtype == 'unsafeClientSkip') {
                    validity[missingInteraction.id] = false;
                    errorMessages[missingInteraction.id] = e.message;
                    shouldBreakAfterEvolve = true;
                }
                else {
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
                    }
                    else {
                        await contract.interactionState().rollback(missingInteraction);
                    }
                }
            }
            else {
                // if that's an inner contract call - only update the state in the uncommitted states
                contract.interactionState().update(contract.txId(), new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages));
            }
        }
        const evalStateResult = new StateEvaluator_1.EvalStateResult(currentState, validity, errorMessages, executionResult ? executionResult : undefined);
        // state could have been fully retrieved from cache
        // or there were no interactions below requested sort key
        if (lastConfirmedTxState !== null) {
            await this.onStateEvaluated(lastConfirmedTxState.tx, executionContext, lastConfirmedTxState.state);
        }
        return new SortKeyCache_1.SortKeyCacheResult(currentSortKey, evalStateResult);
    }
    logResult(result, currentTx, executionContext) {
        if (result.type === 'exception') {
            this.logger.error(`Executing of interaction: [${executionContext.contractDefinition.txId} -> ${currentTx.id}] threw exception:`, `${result.errorMessage}`);
        }
        if (result.type === 'error') {
            this.logger.warn(`Executing of interaction: [${executionContext.contractDefinition.txId} -> ${currentTx.id}] returned error:`, result.errorMessage);
        }
    }
    parseInput(inputTag) {
        try {
            return JSON.parse(inputTag.value);
        }
        catch (e) {
            this.logger.error(e);
            return null;
        }
    }
}
exports.DefaultStateEvaluator = DefaultStateEvaluator;
function canBeCached(tx) {
    // in case of using non-redstone gateway
    if (tx.confirmationStatus === undefined) {
        return true;
    }
    else {
        return tx.confirmationStatus === 'confirmed';
    }
}
//# sourceMappingURL=DefaultStateEvaluator.js.map