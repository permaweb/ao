"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebuggableExecutorFactory = void 0;
/**
 * An ExecutorFactory that allows to substitute original contract's source code.
 * Useful for debugging purposes (e.g. to quickly add some console.logs in contract
 * or to test a fix or a new feature - without the need of redeploying a new contract on Arweave);
 *
 * Not meant to be used in production env! ;-)
 */
class DebuggableExecutorFactory {
    constructor(baseImplementation, 
    // contract source code before default "normalization"
    sourceCode) {
        this.baseImplementation = baseImplementation;
        this.sourceCode = sourceCode;
    }
    async create(contractDefinition, evaluationOptions, warp, interactionState) {
        if (Object.prototype.hasOwnProperty.call(this.sourceCode, contractDefinition.txId)) {
            contractDefinition = {
                ...contractDefinition,
                src: this.sourceCode[contractDefinition.txId]
            };
        }
        return await this.baseImplementation.create(contractDefinition, evaluationOptions, warp, interactionState);
    }
}
exports.DebuggableExecutorFactory = DebuggableExecutorFactory;
//# sourceMappingURL=DebuggableExecutorFactor.js.map