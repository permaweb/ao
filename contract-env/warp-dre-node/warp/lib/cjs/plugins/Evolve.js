"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Evolve = void 0;
const LoggerFactory_1 = require("../logging/LoggerFactory");
const errors_1 = require("../legacy/errors");
function isEvolveCompatible(state) {
    if (!state) {
        return false;
    }
    const settings = evalSettings(state);
    return state.evolve !== undefined || settings.has('evolve');
}
class Evolve {
    constructor() {
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('Evolve');
        this.modify = this.modify.bind(this);
    }
    async modify(state, executionContext) {
        const { definitionLoader, executorFactory } = executionContext.warp;
        const contractTxId = executionContext.contractDefinition.txId;
        const evolvedSrcTxId = Evolve.evolvedSrcTxId(state);
        const currentSrcTxId = executionContext.contractDefinition.srcTxId;
        if (evolvedSrcTxId) {
            if (currentSrcTxId !== evolvedSrcTxId) {
                try {
                    // note: that's really nasty IMO - loading original contract definition,
                    // but forcing different sourceTxId...
                    this.logger.info('Evolving to: ', evolvedSrcTxId);
                    const newContractDefinition = await definitionLoader.load(contractTxId, evolvedSrcTxId);
                    const newHandler = (await executorFactory.create(newContractDefinition, executionContext.evaluationOptions, executionContext.warp, executionContext.contract.interactionState()));
                    //FIXME: side-effect...
                    executionContext.contractDefinition = newContractDefinition;
                    executionContext.handler = newHandler;
                    executionContext.handler.initState(state);
                    this.logger.debug('evolved to:', {
                        evolve: evolvedSrcTxId,
                        newSrcTxId: executionContext.contractDefinition.srcTxId,
                        currentSrcTxId: currentSrcTxId,
                        contract: executionContext.contractDefinition.txId
                    });
                    return executionContext;
                }
                catch (e) {
                    if (e.name === 'ContractError' && e.subtype === 'unsafeClientSkip') {
                        throw e;
                    }
                    else {
                        throw new errors_1.SmartWeaveError(errors_1.SmartWeaveErrorType.CONTRACT_NOT_FOUND, {
                            message: `Error while evolving ${contractTxId} from ${currentSrcTxId} to ${evolvedSrcTxId}: ${e}`,
                            requestedTxId: contractTxId
                        });
                    }
                }
            }
        }
        return executionContext;
    }
    static evolvedSrcTxId(state) {
        if (!isEvolveCompatible(state)) {
            return undefined;
        }
        const settings = evalSettings(state);
        // note: from my understanding - this variable holds the id of the transaction with updated source code.
        const evolve = state.evolve || settings.get('evolve');
        let canEvolve = state.canEvolve || settings.get('canEvolve');
        // By default, contracts can evolve if there's not an explicit `false`.
        if (canEvolve === undefined || canEvolve === null) {
            canEvolve = true;
        }
        if (evolve && /[a-z0-9_-]{43}/i.test(evolve) && canEvolve) {
            return evolve;
        }
        return undefined;
    }
}
exports.Evolve = Evolve;
/* eslint-disable @typescript-eslint/no-explicit-any -- dispatching of any type is done by this function */
function evalSettings(state) {
    // default  - empty
    let settings = new Map();
    if (state.settings) {
        // for Iterable format
        if (isIterable(state.settings)) {
            settings = new Map(state.settings);
            // for Object format
        }
        else if (isObject(state.settings)) {
            settings = new Map(Object.entries(state.settings));
        }
    }
    return settings;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}
function isObject(obj) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}
//# sourceMappingURL=Evolve.js.map