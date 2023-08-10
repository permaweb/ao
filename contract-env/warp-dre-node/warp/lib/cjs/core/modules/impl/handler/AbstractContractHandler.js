"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractContractHandler = void 0;
const LoggerFactory_1 = require("../../../../logging/LoggerFactory");
const utils_1 = require("../../../../utils/utils");
const HandlerExecutorFactory_1 = require("../HandlerExecutorFactory");
class AbstractContractHandler {
    constructor(swGlobal, contractDefinition) {
        this.swGlobal = swGlobal;
        this.contractDefinition = contractDefinition;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('ContractHandler');
        this.assignReadContractState = this.assignReadContractState.bind(this);
        this.assignViewContractState = this.assignViewContractState.bind(this);
        this.assignWrite = this.assignWrite.bind(this);
        this.assignRefreshState = this.assignRefreshState.bind(this);
    }
    async dispose() {
        // noop by default;
    }
    assignWrite(executionContext) {
        this.swGlobal.contracts.write = async (contractTxId, input, throwOnError) => {
            if (!executionContext.evaluationOptions.internalWrites) {
                throw new Error("Internal writes feature switched off. Change EvaluationOptions.internalWrites flag to 'true'");
            }
            const effectiveThrowOnError = throwOnError == undefined ? executionContext.evaluationOptions.throwOnInternalWriteError : throwOnError;
            const debugData = {
                from: this.contractDefinition.txId,
                to: contractTxId,
                input
            };
            this.logger.debug('swGlobal.write call:', debugData);
            // The contract that we want to call and modify its state
            const calleeContract = executionContext.warp.contract(contractTxId, executionContext.contract, {
                callingInteraction: this.swGlobal._activeTx,
                callType: 'write'
            });
            const result = await calleeContract.applyInput(input, this.swGlobal._activeTx);
            this.logger.debug('Cache result?:', !this.swGlobal._activeTx.dry);
            const shouldAutoThrow = result.type !== 'ok' &&
                effectiveThrowOnError &&
                (!this.swGlobal._activeTx.dry || (this.swGlobal._activeTx.dry && this.swGlobal._activeTx.strict));
            const effectiveErrorMessage = shouldAutoThrow
                ? `Internal write auto error for call [${JSON.stringify(debugData)}]: ${result.errorMessage}`
                : result.errorMessage;
            const resultErrorMessages = effectiveErrorMessage
                ? {
                    ...result.originalErrorMessages,
                    [this.swGlobal._activeTx.id]: effectiveErrorMessage
                }
                : result.originalErrorMessages;
            calleeContract.interactionState().update(calleeContract.txId(), {
                state: result.state,
                validity: {
                    ...result.originalValidity,
                    [this.swGlobal._activeTx.id]: result.type == 'ok'
                },
                errorMessages: resultErrorMessages
            });
            if (shouldAutoThrow) {
                throw new HandlerExecutorFactory_1.ContractError(result.type === 'error' && result.error ? result.error : effectiveErrorMessage);
            }
            return result;
        };
    }
    assignViewContractState(executionContext) {
        this.swGlobal.contracts.viewContractState = async (contractTxId, input) => {
            this.logger.debug('swGlobal.viewContractState call:', {
                from: this.contractDefinition.txId,
                to: contractTxId,
                input
            });
            const childContract = executionContext.warp.contract(contractTxId, executionContext.contract, {
                callingInteraction: this.swGlobal._activeTx,
                callType: 'view'
            });
            return await childContract.viewStateForTx(input, this.swGlobal._activeTx);
        };
    }
    assignReadContractState(executionContext, interactionTx) {
        this.swGlobal.contracts.readContractState = async (contractTxId, returnValidity) => {
            var _a, _b, _c;
            this.logger.debug('swGlobal.readContractState call:', {
                from: this.contractDefinition.txId,
                to: contractTxId,
                sortKey: interactionTx.sortKey,
                transaction: this.swGlobal.transaction.id
            });
            const { contract, warp } = executionContext;
            const childContract = warp.contract(contractTxId, contract, {
                callingInteraction: interactionTx,
                callType: 'read'
            });
            const stateWithValidity = await childContract.readState(interactionTx.sortKey);
            if ((_a = stateWithValidity === null || stateWithValidity === void 0 ? void 0 : stateWithValidity.cachedValue) === null || _a === void 0 ? void 0 : _a.errorMessages) {
                const errorKeys = Reflect.ownKeys((_b = stateWithValidity === null || stateWithValidity === void 0 ? void 0 : stateWithValidity.cachedValue) === null || _b === void 0 ? void 0 : _b.errorMessages);
                if (errorKeys.length) {
                    const lastErrorKey = errorKeys[errorKeys.length - 1];
                    const lastErrorMessage = (_c = stateWithValidity === null || stateWithValidity === void 0 ? void 0 : stateWithValidity.cachedValue) === null || _c === void 0 ? void 0 : _c.errorMessages[lastErrorKey];
                    // don't judge me..
                    if (lastErrorMessage.startsWith('[SkipUnsafeError]')) {
                        throw new HandlerExecutorFactory_1.ContractError(lastErrorMessage);
                    }
                }
            }
            // TODO: it should be up to the client's code to decide which part of the result to use
            // (by simply using destructuring operator)...
            // but this (i.e. returning always stateWithValidity from here) would break backwards compatibility
            // in current contract's source code..:/
            const result = returnValidity
                ? {
                    state: (0, utils_1.deepCopy)(stateWithValidity.cachedValue.state),
                    validity: stateWithValidity.cachedValue.validity,
                    errorMessages: stateWithValidity.cachedValue.errorMessages
                }
                : (0, utils_1.deepCopy)(stateWithValidity.cachedValue.state);
            return result;
        };
    }
    assignRefreshState(executionContext) {
        this.swGlobal.contracts.refreshState = async () => {
            var _a;
            return (_a = executionContext.contract.interactionState().get(this.swGlobal.contract.id)) === null || _a === void 0 ? void 0 : _a.state;
        };
    }
}
exports.AbstractContractHandler = AbstractContractHandler;
//# sourceMappingURL=AbstractContractHandler.js.map