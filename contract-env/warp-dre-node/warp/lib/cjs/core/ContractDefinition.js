"use strict";
/**
 * This type contains all data and meta-data of the given contact.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractCache = exports.SrcCache = exports.ContractMetadata = exports.SUPPORTED_SRC_CONTENT_TYPES = void 0;
exports.SUPPORTED_SRC_CONTENT_TYPES = ['application/javascript', 'application/wasm'];
class ContractMetadata {
}
exports.ContractMetadata = ContractMetadata;
class SrcCache {
    constructor(value) {
        this.src = value.src;
        this.srcBinary = value.srcBinary;
        this.srcWasmLang = value.srcWasmLang;
    }
}
exports.SrcCache = SrcCache;
class ContractCache {
    constructor(value) {
        this.txId = value.txId;
        this.srcTxId = value.srcTxId;
        this.initState = value.initState;
        this.manifest = value.manifest;
        this.minFee = value.minFee;
        this.owner = value.owner;
        this.contractType = value.contractType;
        this.metadata = value.metadata;
        this.contractTx = value.contractTx;
        this.srcTx = value.srcTx;
        this.testnet = value.testnet;
    }
}
exports.ContractCache = ContractCache;
//# sourceMappingURL=ContractDefinition.js.map