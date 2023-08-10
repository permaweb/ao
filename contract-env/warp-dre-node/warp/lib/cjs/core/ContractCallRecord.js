"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractionOutput = exports.InteractionInput = exports.InteractionCall = exports.ContractCallRecord = void 0;
const warp_isomorphic_1 = require("warp-isomorphic");
class ContractCallRecord {
    constructor(contractTxId, depth, innerCallType = null) {
        this.contractTxId = contractTxId;
        this.depth = depth;
        this.innerCallType = innerCallType;
        this.interactions = {};
        this.id = warp_isomorphic_1.Crypto.randomUUID();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addInteractionData(interactionData) {
        const { interaction, interactionTx } = interactionData;
        const interactionCall = InteractionCall.create(new InteractionInput(interactionTx.id, interactionTx.sortKey, interactionTx.block.height, interactionTx.block.timestamp, interaction === null || interaction === void 0 ? void 0 : interaction.caller, interaction === null || interaction === void 0 ? void 0 : interaction.input.function, interaction === null || interaction === void 0 ? void 0 : interaction.input, interactionTx.dry, {}));
        this.interactions[interactionTx.id] = interactionCall;
        return interactionCall;
    }
    getInteraction(txId) {
        return this.interactions[txId];
    }
    print() {
        return JSON.stringify(this, null, 2);
    }
}
exports.ContractCallRecord = ContractCallRecord;
class InteractionCall {
    constructor(interactionInput) {
        this.interactionInput = interactionInput;
    }
    static create(interactionInput) {
        return new InteractionCall(interactionInput);
    }
    update(interactionOutput) {
        this.interactionOutput = interactionOutput;
    }
}
exports.InteractionCall = InteractionCall;
class InteractionInput {
    constructor(txId, sortKey, blockHeight, blockTimestamp, caller, functionName, functionArguments, dryWrite, foreignContractCalls = {}) {
        this.txId = txId;
        this.sortKey = sortKey;
        this.blockHeight = blockHeight;
        this.blockTimestamp = blockTimestamp;
        this.caller = caller;
        this.functionName = functionName;
        this.functionArguments = functionArguments;
        this.dryWrite = dryWrite;
        this.foreignContractCalls = foreignContractCalls;
    }
}
exports.InteractionInput = InteractionInput;
class InteractionOutput {
    constructor(cacheHit, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outputState, executionTime, valid, errorMessage = '', gasUsed) {
        this.cacheHit = cacheHit;
        this.outputState = outputState;
        this.executionTime = executionTime;
        this.valid = valid;
        this.errorMessage = errorMessage;
        this.gasUsed = gasUsed;
    }
}
exports.InteractionOutput = InteractionOutput;
//# sourceMappingURL=ContractCallRecord.js.map