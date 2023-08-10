"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArweaveGatewayBundledContractDefinitionLoader = void 0;
const ContractDefinition_1 = require("../../ContractDefinition");
const KnownTags_1 = require("../../KnownTags");
const Benchmark_1 = require("../../../logging/Benchmark");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const ArweaveWrapper_1 = require("../../../utils/ArweaveWrapper");
const ArweaveGQLTxsFetcher_1 = require("./ArweaveGQLTxsFetcher");
const WasmSrc_1 = require("./wasm/WasmSrc");
function getTagValue(tags, tagName, orDefault = undefined) {
    const tag = tags.find(({ name }) => name === tagName);
    return tag ? tag.value : orDefault;
}
class ArweaveGatewayBundledContractDefinitionLoader {
    constructor(env) {
        this.env = env;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create(ArweaveGatewayBundledContractDefinitionLoader.name);
    }
    async load(contractTxId, evolvedSrcTxId) {
        const benchmark = Benchmark_1.Benchmark.measure();
        const contractTx = await this.arweaveTransactions.transaction(contractTxId);
        this.logger.debug('Contract tx fetch time', benchmark.elapsed());
        const owner = contractTx.owner.address;
        const contractSrcTxId = evolvedSrcTxId
            ? evolvedSrcTxId
            : getTagValue(contractTx.tags, KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_SRC_TX_ID);
        const testnet = getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.WARP_TESTNET) || null;
        if (testnet && this.env !== 'testnet') {
            throw new Error('Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.');
        }
        if (!testnet && this.env === 'testnet') {
            throw new Error('Trying to use non-testnet contract in a testnet env.');
        }
        const minFee = getTagValue(contractTx.tags, KnownTags_1.SMART_WEAVE_TAGS.MIN_FEE);
        const manifest = getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.MANIFEST)
            ? JSON.parse(getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.MANIFEST))
            : null;
        this.logger.debug('Tags decoding', benchmark.elapsed());
        const rawInitState = await this.evalInitialState(contractTx);
        this.logger.debug('init state', rawInitState);
        const initState = JSON.parse(rawInitState);
        this.logger.debug('Parsing src and init state', benchmark.elapsed());
        const { src, srcBinary, srcWasmLang, contractType, metadata, srcTx } = await this.loadContractSource(contractSrcTxId);
        const contractDefinition = {
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
            contractTx: await this.convertToWarpCompatibleContractTx(contractTx),
            srcTx: await this.convertToWarpCompatibleContractTx(srcTx),
            testnet
        };
        this.logger.info(`Contract definition loaded in: ${benchmark.elapsed()}`);
        return contractDefinition;
    }
    async convertToWarpCompatibleContractTx(gqlTransaction) {
        const tags = gqlTransaction.tags.map(({ name, value }) => ({
            name: Buffer.from(name).toString('base64url'),
            value: Buffer.from(value).toString('base64url')
        }));
        return {
            tags,
            owner: gqlTransaction.owner.key,
            target: gqlTransaction.recipient,
            signature: gqlTransaction.signature,
            data: (await this.arweaveWrapper.txData(gqlTransaction.id)).toString('base64url')
        };
    }
    async loadContractSource(srcTxId) {
        const benchmark = Benchmark_1.Benchmark.measure();
        const contractSrcTx = await this.arweaveTransactions.transaction(srcTxId);
        const srcContentType = getTagValue(contractSrcTx.tags, KnownTags_1.SMART_WEAVE_TAGS.CONTENT_TYPE);
        if (!ContractDefinition_1.SUPPORTED_SRC_CONTENT_TYPES.includes(srcContentType)) {
            throw new Error(`Contract source content type ${srcContentType} not supported`);
        }
        const contractType = srcContentType === 'application/javascript' ? 'js' : 'wasm';
        const src = contractType === 'js'
            ? await this.arweaveWrapper.txDataString(srcTxId)
            : await this.arweaveWrapper.txData(srcTxId);
        let srcWasmLang;
        let wasmSrc;
        let srcMetaData;
        if (contractType == 'wasm') {
            wasmSrc = new WasmSrc_1.WasmSrc(src);
            srcWasmLang = getTagValue(contractSrcTx.tags, KnownTags_1.WARP_TAGS.WASM_LANG);
            if (!srcWasmLang) {
                throw new Error(`Wasm lang not set for wasm contract src ${srcTxId}`);
            }
            srcMetaData = JSON.parse(getTagValue(contractSrcTx.tags, KnownTags_1.WARP_TAGS.WASM_META));
        }
        this.logger.debug('Contract src tx load', benchmark.elapsed());
        benchmark.reset();
        return {
            src: contractType == 'js' ? src : null,
            srcBinary: contractType == 'wasm' ? wasmSrc.wasmBinary() : null,
            srcWasmLang,
            contractType,
            metadata: srcMetaData,
            srcTx: contractSrcTx
        };
    }
    async evalInitialState(contractTx) {
        if (getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.INIT_STATE)) {
            return getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.INIT_STATE);
        }
        else if (getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.INIT_STATE_TX)) {
            const stateTX = getTagValue(contractTx.tags, KnownTags_1.WARP_TAGS.INIT_STATE_TX);
            return this.arweaveWrapper.txDataString(stateTX);
        }
        else {
            return this.arweaveWrapper.txDataString(contractTx.id);
        }
    }
    setCache() {
        throw new Error('Method not implemented.');
    }
    setSrcCache() {
        throw new Error('Method not implemented.');
    }
    getCache() {
        throw new Error('Method not implemented.');
    }
    getSrcCache() {
        throw new Error('Method not implemented.');
    }
    type() {
        return 'arweave';
    }
    set warp(warp) {
        this.arweaveWrapper = new ArweaveWrapper_1.ArweaveWrapper(warp);
        this.arweaveTransactions = new ArweaveGQLTxsFetcher_1.ArweaveGQLTxsFetcher(warp);
    }
}
exports.ArweaveGatewayBundledContractDefinitionLoader = ArweaveGatewayBundledContractDefinitionLoader;
//# sourceMappingURL=ArweaveGatewayBundledContractDefinitionLoader.js.map