"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractInteractionState = void 0;
class ContractInteractionState {
    constructor(_warp) {
        this._warp = _warp;
        this._json = new Map();
        this._initialJson = new Map();
        this._kv = new Map();
    }
    has(contractTx) {
        return this._json.has(contractTx);
    }
    get(contractTxId) {
        return this._json.get(contractTxId) || null;
    }
    async getKV(contractTxId, cacheKey) {
        var _a;
        if (this._kv.has(contractTxId)) {
            return ((_a = (await this._kv.get(contractTxId).get(cacheKey))) === null || _a === void 0 ? void 0 : _a.cachedValue) || null;
        }
        return null;
    }
    async delKV(contractTxId, cacheKey) {
        if (this._kv.has(contractTxId)) {
            await this._kv.get(contractTxId).del(cacheKey);
        }
    }
    getKvKeys(contractTxId, sortKey, options) {
        const storage = this._warp.kvStorageFactory(contractTxId);
        return storage.keys(sortKey, options);
    }
    getKvRange(contractTxId, sortKey, options) {
        const storage = this._warp.kvStorageFactory(contractTxId);
        return storage.kvMap(sortKey, options);
    }
    async commit(interaction) {
        if (interaction.dry) {
            await this.rollbackKVs();
            return this.reset();
        }
        try {
            await this.doStoreJson(this._json, interaction);
            await this.commitKVs();
        }
        finally {
            this.reset();
        }
    }
    async commitKV() {
        await this.commitKVs();
        this._kv.clear();
    }
    async rollback(interaction) {
        try {
            await this.doStoreJson(this._initialJson, interaction);
            await this.rollbackKVs();
        }
        finally {
            this.reset();
        }
    }
    setInitial(contractTxId, state) {
        // think twice here.
        this._initialJson.set(contractTxId, state);
        this._json.set(contractTxId, state);
    }
    update(contractTxId, state) {
        this._json.set(contractTxId, state);
    }
    async updateKV(contractTxId, key, value) {
        await (await this.getOrInitKvStorage(contractTxId)).put(key, value);
    }
    async getOrInitKvStorage(contractTxId) {
        if (this._kv.has(contractTxId)) {
            return this._kv.get(contractTxId);
        }
        const storage = this._warp.kvStorageFactory(contractTxId);
        this._kv.set(contractTxId, storage);
        await storage.open();
        return storage;
    }
    reset() {
        this._json.clear();
        this._initialJson.clear();
        this._kv.clear();
    }
    async doStoreJson(states, interaction) {
        if (states.size > 1) {
            for (const [k, v] of states) {
                await this._warp.stateEvaluator.putInCache(k, interaction, v);
            }
        }
    }
    async rollbackKVs() {
        for (const storage of this._kv.values()) {
            try {
                await storage.rollback();
            }
            finally {
                await storage.close();
            }
        }
    }
    async commitKVs() {
        for (const storage of this._kv.values()) {
            try {
                await storage.commit();
            }
            finally {
                await storage.close();
            }
        }
    }
}
exports.ContractInteractionState = ContractInteractionState;
//# sourceMappingURL=ContractInteractionState.js.map