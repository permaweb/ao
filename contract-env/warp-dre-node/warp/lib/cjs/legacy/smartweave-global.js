"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KV = exports.SWVrf = exports.SWBlock = exports.SWTransaction = exports.SmartWeaveGlobal = void 0;
const SortKeyCache_1 = require("../cache/SortKeyCache");
class SmartWeaveGlobal {
    constructor(arweave, contract, evaluationOptions, interactionState, storage) {
        this.gasUsed = 0;
        this.gasLimit = Number.MAX_SAFE_INTEGER;
        this.unsafeClient = arweave;
        this.arweave = {
            ar: arweave.ar,
            utils: arweave.utils,
            wallets: arweave.wallets,
            crypto: arweave.crypto
        };
        this.evaluationOptions = evaluationOptions;
        this.contract = contract;
        this.transaction = new SWTransaction(this);
        this.block = new SWBlock(this);
        this.contracts = {
            readContractState: (contractId, height, returnValidity) => {
                throw new Error('Not implemented - should be set by HandlerApi implementor');
            },
            viewContractState: (contractId, input) => {
                throw new Error('Not implemented - should be set by HandlerApi implementor');
            },
            write: (contractId, input, throwOnError) => {
                throw new Error('Not implemented - should be set by HandlerApi implementor');
            },
            refreshState: () => {
                throw new Error('Not implemented - should be set by HandlerApi implementor');
            }
        };
        this.vrf = new SWVrf(this);
        this.useGas = this.useGas.bind(this);
        this.getBalance = this.getBalance.bind(this);
        this.extensions = {};
        this.kv = new KV(storage, interactionState, this.transaction, this.contract.id);
    }
    useGas(gas) {
        if (gas < 0) {
            throw new Error(`[RE:GNE] Gas number exception - gas < 0.`);
        }
        this.gasUsed += gas;
        if (this.gasUsed > this.gasLimit) {
            throw new Error(`[RE:OOG] Out of gas! Used: ${this.gasUsed}, limit: ${this.gasLimit}`);
        }
    }
    async getBalance(address, height) {
        if (!this._activeTx) {
            throw new Error('Cannot read balance - active tx is not set.');
        }
        if (!this.block.height) {
            throw new Error('Cannot read balance - block height not set.');
        }
        const effectiveHeight = height || this.block.height;
        // http://nyc-1.dev.arweave.net:1984/block/height/914387/wallet/M-mpNeJbg9h7mZ-uHaNsa5jwFFRAq0PsTkNWXJ-ojwI/balance
        return await fetch(`${this.evaluationOptions.walletBalanceUrl}block/height/${effectiveHeight}/wallet/${address}/balance`)
            .then((res) => {
            return res.ok ? res.text() : Promise.reject(res);
        })
            .catch((error) => {
            var _a;
            throw new Error(`Unable to read wallet balance. ${error.status}. ${(_a = error.body) === null || _a === void 0 ? void 0 : _a.message}`);
        });
    }
}
exports.SmartWeaveGlobal = SmartWeaveGlobal;
// tslint:disable-next-line: max-classes-per-file
class SWTransaction {
    constructor(smartWeaveGlobal) {
        this.smartWeaveGlobal = smartWeaveGlobal;
    }
    get id() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.id;
    }
    get owner() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.owner.address;
    }
    get target() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.recipient;
    }
    get tags() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.tags;
    }
    get sortKey() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.sortKey;
    }
    get dryRun() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.dry === true;
    }
    get quantity() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.quantity.winston;
    }
    get reward() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.fee.winston;
    }
    get origin() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.source === 'redstone-sequencer' ? 'L2' : 'L1';
    }
}
exports.SWTransaction = SWTransaction;
// tslint:disable-next-line: max-classes-per-file
class SWBlock {
    constructor(smartWeaveGlobal) {
        this.smartWeaveGlobal = smartWeaveGlobal;
    }
    get height() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.block.height;
    }
    get indep_hash() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current Tx');
        }
        return this.smartWeaveGlobal._activeTx.block.id;
    }
    get timestamp() {
        if (!this.smartWeaveGlobal._activeTx) {
            throw new Error('No current tx');
        }
        return this.smartWeaveGlobal._activeTx.block.timestamp;
    }
}
exports.SWBlock = SWBlock;
class SWVrf {
    constructor(smartWeaveGlobal) {
        this.smartWeaveGlobal = smartWeaveGlobal;
    }
    get data() {
        return this.smartWeaveGlobal._activeTx.vrf;
    }
    // returns the original generated random number as a BigInt string;
    get value() {
        return this.smartWeaveGlobal._activeTx.vrf.bigint;
    }
    // returns a random value in a range from 1 to maxValue
    randomInt(maxValue) {
        if (!Number.isInteger(maxValue)) {
            throw new Error('Integer max value required for random integer generation');
        }
        const result = (BigInt(this.smartWeaveGlobal._activeTx.vrf.bigint) % BigInt(maxValue)) + BigInt(1);
        if (result > Number.MAX_SAFE_INTEGER || result < Number.MIN_SAFE_INTEGER) {
            throw new Error('Random int cannot be cast to number');
        }
        return Number(result);
    }
}
exports.SWVrf = SWVrf;
class KV {
    constructor(_storage, _interactionState, _transaction, _contractTxId) {
        this._storage = _storage;
        this._interactionState = _interactionState;
        this._transaction = _transaction;
        this._contractTxId = _contractTxId;
    }
    async put(key, value) {
        this.checkStorageAvailable();
        await this._storage.put(new SortKeyCache_1.CacheKey(key, this._transaction.sortKey), value);
    }
    async get(key) {
        this.checkStorageAvailable();
        const sortKey = this._transaction.sortKey;
        // then we're checking if the values exists in the interactionState
        const interactionStateValue = await this._interactionState.getKV(this._contractTxId, new SortKeyCache_1.CacheKey(key, this._transaction.sortKey));
        if (interactionStateValue != null) {
            return interactionStateValue;
        }
        const result = await this._storage.getLessOrEqual(key, this._transaction.sortKey);
        return (result === null || result === void 0 ? void 0 : result.cachedValue) || null;
    }
    async del(key) {
        this.checkStorageAvailable();
        const sortKey = this._transaction.sortKey;
        // then we're checking if the values exists in the interactionState
        const interactionStateValue = await this._interactionState.delKV(this._contractTxId, new SortKeyCache_1.CacheKey(key, this._transaction.sortKey));
        if (interactionStateValue != null) {
            return interactionStateValue;
        }
        await this._storage.del(new SortKeyCache_1.CacheKey(key, this._transaction.sortKey));
    }
    async keys(options) {
        const sortKey = this._transaction.sortKey;
        return await this._storage.keys(sortKey, options);
    }
    async kvMap(options) {
        const sortKey = this._transaction.sortKey;
        return this._storage.kvMap(sortKey, options);
    }
    async begin() {
        if (this._storage) {
            return this._storage.begin();
        }
    }
    async commit() {
        if (this._storage) {
            if (this._transaction.dryRun) {
                await this._storage.rollback();
            }
            else {
                await this._storage.commit();
            }
        }
    }
    async rollback() {
        if (this._storage) {
            await this._storage.rollback();
        }
    }
    open() {
        if (this._storage) {
            return this._storage.open();
        }
    }
    close() {
        if (this._storage) {
            return this._storage.close();
        }
    }
    checkStorageAvailable() {
        if (!this._storage) {
            throw new Error('KV Storage not available');
        }
    }
}
exports.KV = KV;
//# sourceMappingURL=smartweave-global.js.map