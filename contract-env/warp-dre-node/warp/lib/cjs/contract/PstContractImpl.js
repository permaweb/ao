"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PstContractImpl = void 0;
const HandlerBasedContract_1 = require("./HandlerBasedContract");
class PstContractImpl extends HandlerBasedContract_1.HandlerBasedContract {
    async currentBalance(target) {
        const interactionResult = await this.viewState({ function: 'balance', target });
        if (interactionResult.type !== 'ok') {
            throw Error(interactionResult.errorMessage);
        }
        return interactionResult.result;
    }
    async currentState() {
        return (await super.readState()).cachedValue.state;
    }
    async transfer(transfer, options) {
        return await this.writeInteraction({ function: 'transfer', ...transfer }, options);
    }
}
exports.PstContractImpl = PstContractImpl;
//# sourceMappingURL=PstContractImpl.js.map