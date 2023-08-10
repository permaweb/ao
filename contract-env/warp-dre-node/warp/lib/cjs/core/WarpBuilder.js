"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarpBuilder = void 0;
const DebuggableExecutorFactor_1 = require("../plugins/DebuggableExecutorFactor");
const ArweaveGatewayInteractionsLoader_1 = require("./modules/impl/ArweaveGatewayInteractionsLoader");
const CacheableInteractionsLoader_1 = require("./modules/impl/CacheableInteractionsLoader");
const ContractDefinitionLoader_1 = require("./modules/impl/ContractDefinitionLoader");
const WarpGatewayContractDefinitionLoader_1 = require("./modules/impl/WarpGatewayContractDefinitionLoader");
const WarpGatewayInteractionsLoader_1 = require("./modules/impl/WarpGatewayInteractionsLoader");
const Warp_1 = require("./Warp");
const LevelDbCache_1 = require("../cache/impl/LevelDbCache");
class WarpBuilder {
    constructor(_arweave, _stateCache, _environment = 'custom') {
        this._arweave = _arweave;
        this._stateCache = _stateCache;
        this._environment = _environment;
    }
    setDefinitionLoader(value) {
        this._definitionLoader = value;
        return this;
    }
    setInteractionsLoader(value) {
        this._interactionsLoader = value;
        return this;
    }
    setExecutorFactory(value) {
        this._executorFactory = value;
        return this;
    }
    setStateEvaluator(value) {
        this._stateEvaluator = value;
        return this;
    }
    overwriteSource(sourceCode) {
        if (this._executorFactory == null) {
            throw new Error('Set base ExecutorFactory first');
        }
        this._executorFactory = new DebuggableExecutorFactor_1.DebuggableExecutorFactory(this._executorFactory, sourceCode);
        return this.build();
    }
    useWarpGateway(gatewayOptions, cacheOptions) {
        this._interactionsLoader = new CacheableInteractionsLoader_1.CacheableInteractionsLoader(new WarpGatewayInteractionsLoader_1.WarpGatewayInteractionsLoader(gatewayOptions.confirmationStatus, gatewayOptions.source));
        const contractsCache = new LevelDbCache_1.LevelDbCache({
            ...cacheOptions,
            dbLocation: `${cacheOptions.dbLocation}/contracts`
        });
        // Separate cache for sources to minimize duplicates
        const sourceCache = new LevelDbCache_1.LevelDbCache({
            ...cacheOptions,
            dbLocation: `${cacheOptions.dbLocation}/source`
        });
        this._definitionLoader = new WarpGatewayContractDefinitionLoader_1.WarpGatewayContractDefinitionLoader(this._arweave, contractsCache, sourceCache, this._environment);
        return this;
    }
    useArweaveGateway() {
        this._definitionLoader = new ContractDefinitionLoader_1.ContractDefinitionLoader(this._arweave, this._environment);
        this._interactionsLoader = new CacheableInteractionsLoader_1.CacheableInteractionsLoader(new ArweaveGatewayInteractionsLoader_1.ArweaveGatewayInteractionsLoader(this._arweave, this._environment));
        return this;
    }
    build() {
        const warp = new Warp_1.Warp(this._arweave, this._definitionLoader, this._interactionsLoader, this._executorFactory, this._stateEvaluator, this._environment);
        this._definitionLoader.warp = warp;
        this._interactionsLoader.warp = warp;
        return warp;
    }
}
exports.WarpBuilder = WarpBuilder;
//# sourceMappingURL=WarpBuilder.js.map