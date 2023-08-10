"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsHandlerApi = void 0;
const smartweave_global_1 = require("../../../../legacy/smartweave-global");
const utils_1 = require("../../../../utils/utils");
const LexicographicalInteractionsSorter_1 = require("../LexicographicalInteractionsSorter");
const AbstractContractHandler_1 = require("./AbstractContractHandler");
const INIT_FUNC_NAME = '__init';
const throwErrorWithName = (name, message) => {
    const error = new Error(message);
    error.name = name;
    throw error;
};
var KnownErrors;
(function (KnownErrors) {
    KnownErrors["ContractError"] = "ContractError";
    KnownErrors["ConstructorError"] = "ConstructorError";
})(KnownErrors || (KnownErrors = {}));
class JsHandlerApi extends AbstractContractHandler_1.AbstractContractHandler {
    constructor(swGlobal, contractDefinition, 
    // eslint-disable-next-line
    contractFunction) {
        super(swGlobal, contractDefinition);
        this.contractFunction = contractFunction;
    }
    async handle(executionContext, currentResult, interactionData) {
        const { interaction, interactionTx } = interactionData;
        this.setupSwGlobal(interactionData);
        this.enableInternalWrites(executionContext, interactionTx);
        this.assertNotConstructorCall(interaction);
        return await this.runContractFunction(executionContext, interaction, currentResult.state);
    }
    // eslint-disable-next-line
    initState(state) { }
    async maybeCallStateConstructor(initialState, executionContext) {
        var _a, _b;
        if ((_b = (_a = this.contractDefinition.manifest) === null || _a === void 0 ? void 0 : _a.evaluationOptions) === null || _b === void 0 ? void 0 : _b.useConstructor) {
            const interaction = {
                input: { function: INIT_FUNC_NAME, args: initialState },
                caller: this.contractDefinition.owner,
                interactionType: 'write'
            };
            const interactionTx = {
                owner: { address: executionContext.caller, key: null },
                sortKey: LexicographicalInteractionsSorter_1.genesisSortKey
            };
            const interactionData = { interaction, interactionTx };
            this.setupSwGlobal(interactionData);
            const cleanUpSwGlobal = this.configureSwGlobalForConstructor();
            const result = await this.runContractFunction(executionContext, interaction, {});
            cleanUpSwGlobal();
            if (result.type !== 'ok') {
                throw new Error(`Exception while calling constructor: ${JSON.stringify(interaction)}:\n${result.errorMessage}`);
            }
            return result.state;
        }
        else {
            return initialState;
        }
    }
    assertNotConstructorCall(interaction) {
        var _a, _b;
        if (((_b = (_a = this.contractDefinition.manifest) === null || _a === void 0 ? void 0 : _a.evaluationOptions) === null || _b === void 0 ? void 0 : _b.useConstructor) &&
            interaction.input['function'] === INIT_FUNC_NAME) {
            throw new Error(`You have enabled {useConstructor: true} option, so you can't call function ${INIT_FUNC_NAME}`);
        }
    }
    configureSwGlobalForConstructor() {
        const handler = (prop) => ({
            get: (target, property) => throwErrorWithName('ConstructorError', `SmartWeave.${prop}.${String(property)} is not accessible in constructor context`)
        });
        this.swGlobal.contracts.readContractState = () => throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
        this.swGlobal.contracts.viewContractState = () => throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
        this.swGlobal.contracts.refreshState = () => throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
        this.swGlobal.contracts.write = () => throwErrorWithName('ConstructorError', 'Internal writes feature is not available in constructor');
        const originalBlock = new smartweave_global_1.SWBlock(this.swGlobal);
        this.swGlobal.block = new Proxy(this.swGlobal.block, handler('block'));
        const originalVrf = new smartweave_global_1.SWVrf(this.swGlobal);
        this.swGlobal.vrf = new Proxy(this.swGlobal.vrf, handler('vrf'));
        const originalTransaction = new smartweave_global_1.SWTransaction(this.swGlobal);
        this.swGlobal.transaction = new Proxy(this.swGlobal.vrf, handler('transaction'));
        return () => {
            this.swGlobal.block = originalBlock;
            this.swGlobal.vrf = originalVrf;
            this.swGlobal.transaction = originalTransaction;
        };
    }
    async runContractFunction(executionContext, interaction, state) {
        const stateClone = (0, utils_1.deepCopy)(state);
        const { timeoutId, timeoutPromise } = (0, utils_1.timeout)(executionContext.evaluationOptions.maxInteractionEvaluationTimeSeconds);
        try {
            await this.swGlobal.kv.open();
            await this.swGlobal.kv.begin();
            const handlerResult = await Promise.race([timeoutPromise, this.contractFunction(stateClone, interaction)]);
            if (handlerResult && (handlerResult.state !== undefined || handlerResult.result !== undefined)) {
                await this.swGlobal.kv.commit();
                return {
                    type: 'ok',
                    result: handlerResult.result,
                    state: handlerResult.state || stateClone
                };
            }
            // Will be caught below as unexpected exception.
            throw new Error(`Unexpected result from contract: ${JSON.stringify(handlerResult)}`);
        }
        catch (err) {
            await this.swGlobal.kv.rollback();
            switch (err.name) {
                case KnownErrors.ContractError:
                    return {
                        type: 'error',
                        errorMessage: err.message,
                        state: state,
                        result: null
                    };
                case KnownErrors.ConstructorError:
                    throw Error(`ConstructorError: ${err.message}`);
                default:
                    return {
                        type: 'exception',
                        errorMessage: `${(err && err.stack) || (err && err.message) || err}`,
                        state: state,
                        result: null
                    };
            }
        }
        finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            await this.swGlobal.kv.close();
        }
    }
    setupSwGlobal({ interaction, interactionTx }) {
        this.swGlobal._activeTx = interactionTx;
        this.swGlobal.caller = interaction.caller; // either contract tx id (for internal writes) or transaction.owner
    }
    enableInternalWrites(executionContext, interactionTx) {
        this.assignReadContractState(executionContext, interactionTx);
        this.assignViewContractState(executionContext);
        this.assignWrite(executionContext);
        this.assignRefreshState(executionContext);
    }
}
exports.JsHandlerApi = JsHandlerApi;
//# sourceMappingURL=JsHandlerApi.js.map