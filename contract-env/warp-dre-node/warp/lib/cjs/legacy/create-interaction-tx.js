"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInteractionTagsList = exports.createDummyTx = exports.createInteractionTx = void 0;
const KnownTags_1 = require("../core/KnownTags");
const TagsParser_1 = require("../core/modules/impl/TagsParser");
const arweave_types_1 = require("../utils/types/arweave-types");
async function createInteractionTx(arweave, signer, contractId, input, tags, target = '', winstonQty = '0', dummy = false, isTestnet, reward) {
    const options = {
        data: Math.random().toString().slice(-4)
    };
    if (target && target.length) {
        options.target = target.toString();
        if (winstonQty && +winstonQty > 0) {
            options.quantity = winstonQty.toString();
        }
    }
    // both reward and last_tx are irrelevant in case of interactions
    // that are bundled. So to speed up the process (and prevent the arweave-js
    // from calling /tx_anchor and /price endpoints) - we're presetting these
    // values here
    if (dummy) {
        options.reward = '0';
        options.last_tx = 'p7vc1iSP6bvH_fCeUFa9LqoV5qiyW-jdEKouAT0XMoSwrNraB9mgpi29Q10waEpO';
    }
    if (reward && reward.length) {
        options.reward = reward;
    }
    const interactionTx = await arweave.createTransaction(options);
    const interactionTags = createInteractionTagsList(contractId, input, isTestnet, tags);
    interactionTags.forEach((t) => interactionTx.addTag(t.name, t.value));
    if (signer) {
        await signer(interactionTx);
    }
    return interactionTx;
}
exports.createInteractionTx = createInteractionTx;
function createDummyTx(tx, from, block) {
    // transactions loaded from gateway (either arweave.net GQL or Warp) have the tags decoded
    // - so to be consistent, the "dummy" tx, which is used for viewState and dryWrites, also has to have
    // the tags decoded.
    const tagsParser = new TagsParser_1.TagsParser();
    const decodedTags = tagsParser.decodeTags(tx);
    return {
        id: tx.id,
        owner: {
            address: from,
            key: ''
        },
        recipient: tx.target,
        tags: decodedTags,
        fee: {
            winston: tx.reward,
            ar: ''
        },
        quantity: {
            winston: tx.quantity,
            ar: ''
        },
        block: {
            id: block.indep_hash,
            height: block.height,
            timestamp: block.timestamp,
            previous: null
        },
        // note: calls within dry runs cannot be cached (per block - like the state cache)!
        // that's super important, as the block height used for
        // the dry-run is the current network block height
        // - and not the block height of the real transaction that
        // will be mined on Arweave.
        // If we start caching results of the dry-runs, we can completely fuck-up
        // the consecutive state evaluations.
        // - that's why we're setting "dry" flag to true here
        // - this prevents the caching layer from saving
        // the state evaluated for such interaction in cache.
        dry: true,
        anchor: null,
        signature: null,
        data: null,
        parent: null,
        bundledIn: null
    };
}
exports.createDummyTx = createDummyTx;
function createInteractionTagsList(contractId, input, isTestnet, customTags) {
    const interactionTags = [];
    if (customTags && customTags.length) {
        for (const customTag of customTags) {
            interactionTags.push(new arweave_types_1.Tag(customTag.name.toString(), customTag.value.toString()));
        }
    }
    interactionTags.push(new arweave_types_1.Tag(KnownTags_1.SMART_WEAVE_TAGS.APP_NAME, 'SmartWeaveAction'));
    // use real SDK version here?
    interactionTags.push(new arweave_types_1.Tag(KnownTags_1.SMART_WEAVE_TAGS.APP_VERSION, '0.3.0'));
    interactionTags.push(new arweave_types_1.Tag(KnownTags_1.SMART_WEAVE_TAGS.SDK, 'Warp'));
    interactionTags.push(new arweave_types_1.Tag(KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_TX_ID, contractId));
    interactionTags.push(new arweave_types_1.Tag(KnownTags_1.SMART_WEAVE_TAGS.INPUT, JSON.stringify(input)));
    if (isTestnet) {
        interactionTags.push(new arweave_types_1.Tag(KnownTags_1.WARP_TAGS.WARP_TESTNET, '1.0.0'));
    }
    return interactionTags;
}
exports.createInteractionTagsList = createInteractionTagsList;
//# sourceMappingURL=create-interaction-tx.js.map