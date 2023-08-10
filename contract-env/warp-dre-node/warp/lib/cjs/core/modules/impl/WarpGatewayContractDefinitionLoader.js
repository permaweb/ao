"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarpGatewayContractDefinitionLoader = void 0;
const ContractDefinitionLoader_1 = require("./ContractDefinitionLoader");
const warp_isomorphic_1 = require("warp-isomorphic");
const ContractDefinition_1 = require("../../ContractDefinition");
const KnownTags_1 = require("../../KnownTags");
const Benchmark_1 = require("../../../logging/Benchmark");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const ArweaveWrapper_1 = require("../../../utils/ArweaveWrapper");
const WasmSrc_1 = require("./wasm/WasmSrc");
const TagsParser_1 = require("./TagsParser");
const SortKeyCache_1 = require("../../../cache/SortKeyCache");
const arweave_types_1 = require("../../../utils/types/arweave-types");
const utils_1 = require("../../../utils/utils");
/**
 * An extension to {@link ContractDefinitionLoader} that makes use of
 * Warp Gateway ({@link https://github.com/redstone-finance/redstone-sw-gateway})
 * to load Contract Data.
 *
 * If the contract data is not available on Warp Gateway - it fallbacks to default implementation
 * in {@link ContractDefinitionLoader} - i.e. loads the definition from Arweave gateway.
 */
class WarpGatewayContractDefinitionLoader {
    constructor(arweave, definitionCache, srcCache, env) {
        this.definitionCache = definitionCache;
        this.srcCache = srcCache;
        this.env = env;
        this.rLogger = LoggerFactory_1.LoggerFactory.INST.create('WarpGatewayContractDefinitionLoader');
        this.contractDefinitionLoader = new ContractDefinitionLoader_1.ContractDefinitionLoader(arweave, env);
        this.tagsParser = new TagsParser_1.TagsParser();
    }
    async load(contractTxId, evolvedSrcTxId) {
        const result = await this.getFromCache(contractTxId, evolvedSrcTxId);
        if (result) {
            this.rLogger.debug('WarpGatewayContractDefinitionLoader: Hit from cache!');
            // LevelDB serializes Buffer to an object with 'type' and 'data' fields
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (result.contractType == 'wasm' && result.srcBinary.data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result.srcBinary = warp_isomorphic_1.Buffer.from(result.srcBinary.data);
            }
            this.verifyEnv(result);
            return result;
        }
        const benchmark = Benchmark_1.Benchmark.measure();
        const contract = await this.doLoad(contractTxId, evolvedSrcTxId);
        this.rLogger.info(`Contract definition loaded in: ${benchmark.elapsed()}`);
        this.verifyEnv(contract);
        await this.putToCache(contractTxId, contract, evolvedSrcTxId);
        return contract;
    }
    async doLoad(contractTxId, forcedSrcTxId) {
        try {
            const baseUrl = (0, utils_1.stripTrailingSlash)(this._warp.gwUrl());
            const result = await (0, utils_1.getJsonResponse)(fetch(`${baseUrl}/gateway/contract?txId=${contractTxId}${forcedSrcTxId ? `&srcTxId=${forcedSrcTxId}` : ''}`));
            if (result.srcBinary != null && !(result.srcBinary instanceof warp_isomorphic_1.Buffer)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result.srcBinary = warp_isomorphic_1.Buffer.from(result.srcBinary.data);
            }
            if (result.srcBinary) {
                const wasmSrc = new WasmSrc_1.WasmSrc(result.srcBinary);
                result.srcBinary = wasmSrc.wasmBinary();
                let sourceTx;
                if (result.srcTx) {
                    sourceTx = new arweave_types_1.Transaction({ ...result.srcTx });
                }
                else {
                    sourceTx = await this.arweaveWrapper.tx(result.srcTxId);
                }
                const srcMetaData = JSON.parse(this.tagsParser.getTag(sourceTx, KnownTags_1.WARP_TAGS.WASM_META));
                result.metadata = srcMetaData;
            }
            result.contractType = result.src ? 'js' : 'wasm';
            return result;
        }
        catch (e) {
            this.rLogger.warn('Falling back to default contracts loader', e);
            return await this.contractDefinitionLoader.doLoad(contractTxId, forcedSrcTxId);
        }
    }
    async loadContractSource(contractSrcTxId) {
        return await this.contractDefinitionLoader.loadContractSource(contractSrcTxId);
    }
    type() {
        return 'warp';
    }
    setCache(cache) {
        this.definitionCache = cache;
    }
    setSrcCache(cacheSrc) {
        this.srcCache = cacheSrc;
    }
    getCache() {
        return this.definitionCache;
    }
    getSrcCache() {
        return this.srcCache;
    }
    verifyEnv(def) {
        if (def.testnet && this.env !== 'testnet') {
            throw new Error('Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.');
        }
        if (!def.testnet && this.env === 'testnet') {
            throw new Error('Trying to use non-testnet contract in a testnet env.');
        }
    }
    // Gets ContractDefinition and ContractSource from two caches and returns a combined structure
    async getFromCache(contractTxId, srcTxId) {
        const contract = (await this.definitionCache.get(new SortKeyCache_1.CacheKey(contractTxId, 'cd')));
        if (!contract) {
            return null;
        }
        const src = await this.srcCache.get(new SortKeyCache_1.CacheKey(srcTxId || contract.cachedValue.srcTxId, 'src'));
        if (!src) {
            return null;
        }
        return { ...contract.cachedValue, ...src.cachedValue };
    }
    // Divides ContractDefinition into entries in two caches to avoid duplicates
    async putToCache(contractTxId, value, srcTxId) {
        const src = new ContractDefinition_1.SrcCache(value);
        const contract = new ContractDefinition_1.ContractCache(value);
        await this.definitionCache.put({ key: contractTxId, sortKey: 'cd' }, contract);
        await this.srcCache.put({ key: srcTxId || contract.srcTxId, sortKey: 'src' }, src);
    }
    set warp(warp) {
        this._warp = warp;
        this.arweaveWrapper = new ArweaveWrapper_1.ArweaveWrapper(warp);
        this.contractDefinitionLoader.warp = warp;
    }
}
exports.WarpGatewayContractDefinitionLoader = WarpGatewayContractDefinitionLoader;
//# sourceMappingURL=WarpGatewayContractDefinitionLoader.js.map