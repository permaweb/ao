"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheableInteractionsLoader = void 0;
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
class CacheableInteractionsLoader {
    constructor(delegate) {
        this.delegate = delegate;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('CacheableInteractionsLoader');
        this.interactionsCache = new Map();
    }
    async load(contractTxId, fromSortKey, toSortKey, evaluationOptions) {
        this.logger.debug(`Loading interactions for`, {
            contractTxId,
            fromSortKey,
            toSortKey
        });
        if (!this.interactionsCache.has(contractTxId)) {
            const interactions = await this.delegate.load(contractTxId, fromSortKey, toSortKey, evaluationOptions);
            if (interactions.length) {
                this.interactionsCache.set(contractTxId, interactions);
            }
            return interactions;
        }
        else {
            const cachedInteractions = this.interactionsCache.get(contractTxId);
            if (cachedInteractions === null || cachedInteractions === void 0 ? void 0 : cachedInteractions.length) {
                const lastCachedKey = cachedInteractions[cachedInteractions.length - 1].sortKey;
                if (lastCachedKey.localeCompare(toSortKey) < 0) {
                    const missingInteractions = await this.delegate.load(contractTxId, lastCachedKey, toSortKey, evaluationOptions);
                    const allInteractions = cachedInteractions.concat(missingInteractions);
                    this.interactionsCache.set(contractTxId, allInteractions);
                    return allInteractions;
                }
            }
            return cachedInteractions;
        }
    }
    type() {
        return this.delegate.type();
    }
    clearCache() {
        this.interactionsCache.clear();
    }
    set warp(warp) {
        this.delegate.warp = warp;
    }
}
exports.CacheableInteractionsLoader = CacheableInteractionsLoader;
//# sourceMappingURL=CacheableInteractionsLoader.js.map