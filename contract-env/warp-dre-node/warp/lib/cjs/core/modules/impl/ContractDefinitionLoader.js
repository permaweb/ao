"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractDefinitionLoader = void 0;
const ContractDefinition_1 = require("../../ContractDefinition");
const KnownTags_1 = require("../../KnownTags");
const Benchmark_1 = require("../../../logging/Benchmark");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const ArweaveWrapper_1 = require("../../../utils/ArweaveWrapper");
const TagsParser_1 = require("./TagsParser");
const WasmSrc_1 = require("./wasm/WasmSrc");
class ContractDefinitionLoader {
    constructor(arweave, env) {
        this.arweave = arweave;
        this.env = env;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('ContractDefinitionLoader');
        this.tagsParser = new TagsParser_1.TagsParser();
    }
    async load(contractTxId, evolvedSrcTxId) {
        const benchmark = Benchmark_1.Benchmark.measure();
        const contract = await this.doLoad(contractTxId, evolvedSrcTxId);
        this.logger.info(`Contract definition loaded in: ${benchmark.elapsed()}`);
        return contract;
    }
    async doLoad(contractTxId, forcedSrcTxId) {
        const benchmark = Benchmark_1.Benchmark.measure();
        const contractTx = await this.arweaveWrapper.tx(contractTxId);
        const owner = await this.arweave.wallets.ownerToAddress(contractTx.owner);
        this.logger.debug('Contract tx and owner', benchmark.elapsed());
        benchmark.reset();
        const contractSrcTxId = forcedSrcTxId
            ? forcedSrcTxId
            : this.tagsParser.getTag(contractTx, KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_SRC_TX_ID);
        const testnet = this.tagsParser.getTag(contractTx, KnownTags_1.WARP_TAGS.WARP_TESTNET) || null;
        if (testnet && this.env !== 'testnet') {
            throw new Error('Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.');
        }
        if (!testnet && this.env === 'testnet') {
            throw new Error('Trying to use non-testnet contract in a testnet env.');
        }
        const minFee = this.tagsParser.getTag(contractTx, KnownTags_1.SMART_WEAVE_TAGS.MIN_FEE);
        let manifest = null;
        const rawManifest = this.tagsParser.getTag(contractTx, KnownTags_1.WARP_TAGS.MANIFEST);
        if (rawManifest) {
            manifest = JSON.parse(rawManifest);
        }
        this.logger.debug('Tags decoding', benchmark.elapsed());
        benchmark.reset();
        const s = await this.evalInitialState(contractTx);
        this.logger.debug('init state', s);
        const initState = JSON.parse(s);
        this.logger.debug('Parsing src and init state', benchmark.elapsed());
        const { src, srcBinary, srcWasmLang, contractType, metadata, srcTx } = await this.loadContractSource(contractSrcTxId);
        return {
            txId: contractTxId,
            srcTxId: contractSrcTxId,
            src,
            srcBinary,
            srcWasmLang,
            initState,
            minFee,
            owner,
            contractType,
            metadata,
            manifest,
            contractTx: contractTx.toJSON(),
            srcTx,
            testnet
        };
    }
    async loadContractSource(contractSrcTxId) {
        const benchmark = Benchmark_1.Benchmark.measure();
        const contractSrcTx = await this.arweaveWrapper.tx(contractSrcTxId);
        const srcContentType = this.tagsParser.getTag(contractSrcTx, KnownTags_1.SMART_WEAVE_TAGS.CONTENT_TYPE);
        if (!ContractDefinition_1.SUPPORTED_SRC_CONTENT_TYPES.includes(srcContentType)) {
            throw new Error(`Contract source content type ${srcContentType} not supported`);
        }
        const contractType = srcContentType == 'application/javascript' ? 'js' : 'wasm';
        const src = contractType == 'js'
            ? await this.arweaveWrapper.txDataString(contractSrcTxId)
            : await this.arweaveWrapper.txData(contractSrcTxId);
        let srcWasmLang;
        let wasmSrc;
        let srcMetaData;
        if (contractType == 'wasm') {
            wasmSrc = new WasmSrc_1.WasmSrc(src);
            srcWasmLang = this.tagsParser.getTag(contractSrcTx, KnownTags_1.WARP_TAGS.WASM_LANG);
            if (!srcWasmLang) {
                throw new Error(`Wasm lang not set for wasm contract src ${contractSrcTxId}`);
            }
            srcMetaData = JSON.parse(this.tagsParser.getTag(contractSrcTx, KnownTags_1.WARP_TAGS.WASM_META));
        }
        this.logger.debug('Contract src tx load', benchmark.elapsed());
        benchmark.reset();
        return {
            src: contractType == 'js' ? src : null,
            srcBinary: contractType == 'wasm' ? wasmSrc.wasmBinary() : null,
            srcWasmLang,
            contractType,
            metadata: srcMetaData,
            srcTx: contractSrcTx.toJSON()
        };
    }
    async evalInitialState(contractTx) {
        if (this.tagsParser.getTag(contractTx, KnownTags_1.WARP_TAGS.INIT_STATE)) {
            return this.tagsParser.getTag(contractTx, KnownTags_1.WARP_TAGS.INIT_STATE);
        }
        else if (this.tagsParser.getTag(contractTx, KnownTags_1.WARP_TAGS.INIT_STATE_TX)) {
            const stateTX = this.tagsParser.getTag(contractTx, KnownTags_1.WARP_TAGS.INIT_STATE_TX);
            return this.arweaveWrapper.txDataString(stateTX);
        }
        else {
            return this.arweaveWrapper.txDataString(contractTx.id);
        }
    }
    type() {
        return 'arweave';
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setCache(cache) {
        throw new Error('No cache implemented for this loader');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setSrcCache(cache) {
        throw new Error('No cache implemented for this loader');
    }
    getCache() {
        throw new Error('No cache implemented for this loader');
    }
    getSrcCache() {
        throw new Error('No cache implemented for this loader');
    }
    set warp(warp) {
        this.arweaveWrapper = new ArweaveWrapper_1.ArweaveWrapper(warp);
    }
}
exports.ContractDefinitionLoader = ContractDefinitionLoader;
//# sourceMappingURL=ContractDefinitionLoader.js.map