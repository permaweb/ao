"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEvaluationOptions = exports.EvalStateResult = void 0;
const WarpGatewayInteractionsLoader_1 = require("./impl/WarpGatewayInteractionsLoader");
class EvalStateResult {
    constructor(state, validity, errorMessages, result) {
        this.state = state;
        this.validity = validity;
        this.errorMessages = errorMessages;
        this.result = result;
    }
}
exports.EvalStateResult = EvalStateResult;
class DefaultEvaluationOptions {
    constructor() {
        // default = true - still cannot decide whether true or false should be the default.
        // "false" may lead to some fairly simple attacks on contract, if the contract
        // does not properly validate input data.
        // "true" may lead to wrongly calculated state, even without noticing the problem
        // (e.g. when using unsafe client and Arweave does not respond properly for a while)
        this.ignoreExceptions = true;
        this.waitForConfirmation = false;
        this.updateCacheForEachInteraction = false;
        this.internalWrites = false;
        this.maxCallDepth = 7; // your lucky number...
        this.maxInteractionEvaluationTimeSeconds = 60;
        this.stackTrace = {
            saveState: false
        };
        this.sequencerUrl = `https://d1o5nlqr4okus2.cloudfront.net/`;
        this.gasLimit = Number.MAX_SAFE_INTEGER;
        this.sourceType = WarpGatewayInteractionsLoader_1.SourceType.BOTH;
        this.unsafeClient = 'throw';
        this.allowBigInt = false;
        this.walletBalanceUrl = 'http://nyc-1.dev.arweave.net:1984/';
        this.mineArLocalBlocks = true;
        this.throwOnInternalWriteError = true;
        this.cacheEveryNInteractions = -1;
        this.useKVStorage = false;
        this.remoteStateSyncEnabled = false;
        this.remoteStateSyncSource = 'https://dre-1.warp.cc/contract';
        this.useConstructor = false;
    }
}
exports.DefaultEvaluationOptions = DefaultEvaluationOptions;
//# sourceMappingURL=StateEvaluator.js.map