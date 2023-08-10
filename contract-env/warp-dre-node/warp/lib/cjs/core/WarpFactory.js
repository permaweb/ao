"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarpFactory = exports.defaultCacheOptions = exports.DEFAULT_LEVEL_DB_LOCATION = exports.WARP_GW_URL = exports.defaultWarpGwOptions = void 0;
const arweave_1 = __importDefault(require("arweave"));
const LevelDbCache_1 = require("../cache/impl/LevelDbCache");
const Evolve_1 = require("../plugins/Evolve");
const CacheableStateEvaluator_1 = require("./modules/impl/CacheableStateEvaluator");
const HandlerExecutorFactory_1 = require("./modules/impl/HandlerExecutorFactory");
const WarpGatewayInteractionsLoader_1 = require("./modules/impl/WarpGatewayInteractionsLoader");
const Warp_1 = require("./Warp");
exports.defaultWarpGwOptions = {
    confirmationStatus: { notCorrupted: true },
    source: WarpGatewayInteractionsLoader_1.SourceType.BOTH
};
/**
 * @Deprecated - will be removed soon, left for backwards compatibility with deploy plugin
 */
exports.WARP_GW_URL = 'https://gw.warp.cc';
exports.DEFAULT_LEVEL_DB_LOCATION = './cache/warp';
exports.defaultCacheOptions = {
    inMemory: false,
    dbLocation: exports.DEFAULT_LEVEL_DB_LOCATION
};
/**
 * A factory that simplifies the process of creating different versions of {@link Warp}.
 * All versions use the {@link Evolve} plugin.
 */
class WarpFactory {
    /**
     * creates a Warp instance suitable for testing in a local environment
     * (e.g. usually using ArLocal)
     * @param arweave - an instance of Arweave
     * @param cacheOptions - optional cache options. By default, the in-memory cache is used.
     */
    static forLocal(port = 1984, arweave = arweave_1.default.init({
        host: 'localhost',
        port: port,
        protocol: 'http'
    }), cacheOptions = {
        ...exports.defaultCacheOptions,
        inMemory: true
    }) {
        return this.customArweaveGw(arweave, cacheOptions, 'local');
    }
    /**
     * creates a Warp instance suitable for testing
     * with Warp testnet (https://testnet.redstone.tools/)
     */
    static forTestnet(cacheOptions = exports.defaultCacheOptions, useArweaveGw = false, arweave = arweave_1.default.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    })) {
        if (useArweaveGw) {
            return this.customArweaveGw(arweave, cacheOptions, 'testnet');
        }
        else {
            return this.customWarpGw(arweave, exports.defaultWarpGwOptions, cacheOptions, 'testnet');
        }
    }
    /**
     * creates a Warp instance suitable for use with mainnet.
     * By default, the Warp gateway (https://github.com/warp-contracts/gateway#warp-gateway)
     * is being used for:
     * 1. deploying contracts
     * 2. writing new transactions through Warp Sequencer
     * 3. loading contract interactions
     *
     * @param cacheOptions - cache options, defaults {@link defaultCacheOptions}
     * @param useArweaveGw - use arweave.net gateway for deploying contracts,
     * writing and loading interactions
     * @param arweave - custom Arweave instance
     */
    static forMainnet(cacheOptions = exports.defaultCacheOptions, useArweaveGw = false, arweave = arweave_1.default.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    })) {
        if (useArweaveGw) {
            return this.customArweaveGw(arweave, cacheOptions, 'mainnet');
        }
        else {
            return this.customWarpGw(arweave, exports.defaultWarpGwOptions, cacheOptions, 'mainnet');
        }
    }
    /**
     * returns an instance of {@link WarpBuilder} that allows to fully customize the Warp instance.
     * @param arweave
     * @param cacheOptions
     */
    static custom(arweave, cacheOptions, environment) {
        const stateCache = new LevelDbCache_1.LevelDbCache({
            ...cacheOptions,
            dbLocation: `${cacheOptions.dbLocation}/state`
        });
        const executorFactory = new HandlerExecutorFactory_1.HandlerExecutorFactory(arweave);
        const stateEvaluator = new CacheableStateEvaluator_1.CacheableStateEvaluator(arweave, stateCache, [new Evolve_1.Evolve()]);
        return Warp_1.Warp.builder(arweave, stateCache, environment)
            .setExecutorFactory(executorFactory)
            .setStateEvaluator(stateEvaluator);
    }
    static customArweaveGw(arweave, cacheOptions = exports.defaultCacheOptions, environment) {
        return this.custom(arweave, cacheOptions, environment).useArweaveGateway().build();
    }
    static customWarpGw(arweave, gatewayOptions = exports.defaultWarpGwOptions, cacheOptions = exports.defaultCacheOptions, environment) {
        return this.custom(arweave, cacheOptions, environment).useWarpGateway(gatewayOptions, cacheOptions).build();
    }
}
exports.WarpFactory = WarpFactory;
//# sourceMappingURL=WarpFactory.js.map