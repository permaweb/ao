"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagsParser = void 0;
const KnownTags_1 = require("../../KnownTags");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
/**
 * A class that is responsible for retrieving "input" tag from the interaction transaction.
 * Two tags formats are allowed:
 * 1. "multiple interactions in one tx" format - where "Input" tag MUST be next to the "Contract" tag
 *    See more at https://github.com/ArweaveTeam/SmartWeave/pull/51
 * 2. "traditional" format - one interaction per one transaction - where tags order does not matter.
 *
 * More on Discord: https://discord.com/channels/357957786904166400/756557551234973696/885388585023463424
 */
class TagsParser {
    constructor() {
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('TagsParser');
    }
    getInputTag(interactionTransaction, contractTxId) {
        // this is the part to retain compatibility with https://github.com/ArweaveTeam/SmartWeave/pull/51
        if (TagsParser.hasMultipleInteractions(interactionTransaction)) {
            this.logger.debug('Interaction transaction is using multiple input tx tag format.');
            const contractTagIndex = interactionTransaction.tags.findIndex((tag) => tag.name === KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_TX_ID && tag.value === contractTxId);
            // if "Contract" is the last tag
            if (interactionTransaction.tags.length - 1 === contractTagIndex) {
                this.logger.warn("Wrong tags format: 'Contract' is the last tag");
                return undefined;
            }
            // in this case the "Input" tag MUST be right after the "Contract" tag
            const inputTag = interactionTransaction.tags[contractTagIndex + 1];
            // if the tag after "Contract" tag has wrong name
            if (inputTag.name !== KnownTags_1.SMART_WEAVE_TAGS.INPUT) {
                this.logger.warn(`No 'Input' tag found after 'Contract' tag. Instead ${inputTag.name} was found`);
                return undefined;
            }
            return inputTag;
        }
        else {
            // the "old way" - i.e. tags ordering does not matter,
            // if there is at most one "Contract" tag
            // - so returning the first occurrence of "Input" tag.
            return interactionTransaction.tags.find((tag) => tag.name === KnownTags_1.SMART_WEAVE_TAGS.INPUT);
        }
    }
    isInteractWrite(interactionTransaction, contractTxId) {
        return interactionTransaction.tags.some((tag) => tag.name === KnownTags_1.WARP_TAGS.INTERACT_WRITE && tag.value === contractTxId);
    }
    getInteractWritesContracts(interactionTransaction) {
        return interactionTransaction.tags.filter((tag) => tag.name === KnownTags_1.WARP_TAGS.INTERACT_WRITE).map((t) => t.value);
    }
    getContractTag(interactionTransaction) {
        var _a;
        return (_a = interactionTransaction.tags.find((tag) => tag.name === KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_TX_ID)) === null || _a === void 0 ? void 0 : _a.value;
    }
    getContractsWithInputs(interactionTransaction) {
        const result = new Map();
        const contractTags = interactionTransaction.tags.filter((tag) => tag.name === KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_TX_ID);
        contractTags.forEach((contractTag) => {
            result.set(contractTag.value, this.getInputTag(interactionTransaction, contractTag.value));
        });
        return result;
    }
    isEvmSigned(interactionTransaction) {
        return interactionTransaction.tags.some((tag) => tag.name === KnownTags_1.WARP_TAGS.SIGNATURE_TYPE && tag.value === 'ethereum');
    }
    static hasMultipleInteractions(interactionTransaction) {
        return interactionTransaction.tags.filter((tag) => tag.name === KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_TX_ID).length > 1;
    }
    decodeTags(tx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags = tx.get('tags');
        const result = [];
        for (const tag of tags) {
            try {
                const name = tag.get('name', { decode: true, string: true });
                const value = tag.get('value', { decode: true, string: true });
                result.push({ name, value });
            }
            catch (e) {
                // ignore tags with invalid utf-8 strings in key or value.
            }
        }
        return result;
    }
    getTag(tx, name) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tags = tx.get('tags');
        for (const tag of tags) {
            try {
                if (tag.get('name', { decode: true, string: true }) === name) {
                    return tag.get('value', { decode: true, string: true });
                }
            }
            catch (e) {
                // ignore tags with invalid utf-8 strings in key or value.
            }
        }
        return false;
    }
    hasVrfTag(interaction) {
        return interaction.tags.some((t) => {
            return t.name == KnownTags_1.WARP_TAGS.REQUEST_VRF && t.value === 'true';
        });
    }
}
exports.TagsParser = TagsParser;
//# sourceMappingURL=TagsParser.js.map