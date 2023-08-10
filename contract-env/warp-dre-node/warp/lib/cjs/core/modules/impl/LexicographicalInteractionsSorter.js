"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LexicographicalInteractionsSorter = exports.lastPossibleSortKey = exports.genesisSortKey = exports.sortingLast = exports.sortingFirst = exports.defaultArweaveMs = void 0;
const utils_1 = require("../../../legacy/utils");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
// note: this (i.e. padding to 13 digits) should be safe between years ~1966 and ~2286
const firstSortKeyMs = ''.padEnd(13, '0');
const lastSortKeyMs = ''.padEnd(13, '9');
exports.defaultArweaveMs = ''.padEnd(13, '0');
exports.sortingFirst = ''.padEnd(64, '0');
exports.sortingLast = ''.padEnd(64, 'z');
exports.genesisSortKey = `${''.padStart(12, '0')},${firstSortKeyMs},${exports.sortingFirst}`;
exports.lastPossibleSortKey = `${''.padStart(12, '9')},${lastSortKeyMs},${exports.sortingLast}`;
/**
 * implementation that is based on current's SDK sorting alg.
 */
class LexicographicalInteractionsSorter {
    constructor(arweave) {
        this.arweave = arweave;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('LexicographicalInteractionsSorter');
    }
    async sort(transactions) {
        const copy = [...transactions];
        const addKeysFuncs = copy.map((tx) => this.addSortKey(tx));
        await Promise.all(addKeysFuncs);
        return copy.sort((a, b) => a.node.sortKey.localeCompare(b.node.sortKey));
    }
    async createSortKey(blockId, transactionId, blockHeight, dummy = false) {
        const blockHashBytes = this.arweave.utils.b64UrlToBuffer(blockId);
        const txIdBytes = this.arweave.utils.b64UrlToBuffer(transactionId);
        const concatenated = this.arweave.utils.concatBuffers([blockHashBytes, txIdBytes]);
        const hashed = (0, utils_1.arrayToHex)(await this.arweave.crypto.hash(concatenated));
        const blockHeightString = `${blockHeight}`.padStart(12, '0');
        const arweaveMs = dummy ? lastSortKeyMs : exports.defaultArweaveMs;
        return `${blockHeightString},${arweaveMs},${hashed}`;
    }
    extractBlockHeight(sortKey) {
        // I feel sorry for myself...
        return sortKey ? parseInt(sortKey.split(',')[0]) : null;
    }
    async addSortKey(txInfo) {
        const { node } = txInfo;
        // might have been already set by the Warp Sequencer
        const sortKey = txInfo.node.sortKey;
        if (sortKey) {
            txInfo.node.sortKey = sortKey;
            this.logger.debug('Using sortKey from sequencer', txInfo.node.sortKey);
        }
        else {
            txInfo.node.sortKey = await this.createSortKey(node.block.id, node.id, node.block.height);
        }
    }
    generateLastSortKey(blockHeight) {
        const blockHeightString = `${blockHeight}`.padStart(12, '0');
        return `${blockHeightString},${lastSortKeyMs},${exports.sortingLast}`;
    }
}
exports.LexicographicalInteractionsSorter = LexicographicalInteractionsSorter;
//# sourceMappingURL=LexicographicalInteractionsSorter.js.map