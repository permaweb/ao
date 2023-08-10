"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArweaveGatewayBundledInteractionLoader = void 0;
const KnownTags_1 = require("../../KnownTags");
const Benchmark_1 = require("../../../logging/Benchmark");
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const ArweaveWrapper_1 = require("../../../utils/ArweaveWrapper");
const LexicographicalInteractionsSorter_1 = require("./LexicographicalInteractionsSorter");
const ArweaveGQLTxsFetcher_1 = require("./ArweaveGQLTxsFetcher");
const utils_1 = require("../../../utils/utils");
const TagsParser_1 = require("./TagsParser");
const MAX_REQUEST = 100;
// SortKey.blockHeight is block height
// at which interaction was sent to bundler
// it can be actually finalized in later block
// we assume that this maximal "delay"
const EMPIRIC_BUNDLR_FINALITY_TIME = 100;
// a height from which the last sort key value is being set by the sequencer
const LAST_SORT_KEY_MIN_HEIGHT = 1057409;
class ArweaveGatewayBundledInteractionLoader {
    constructor(arweave, environment) {
        this.arweave = arweave;
        this.environment = environment;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create(ArweaveGatewayBundledInteractionLoader.name);
        this.tagsParser = new TagsParser_1.TagsParser();
        this.sorter = new LexicographicalInteractionsSorter_1.LexicographicalInteractionsSorter(arweave);
    }
    async load(contractId, fromSortKey, toSortKey, evaluationOptions) {
        this.logger.debug('Loading interactions for', { contractId, fromSortKey, toSortKey });
        const fromBlockHeight = this.sorter.extractBlockHeight(fromSortKey) || 0;
        const toBlockHeight = this.sorter.extractBlockHeight(toSortKey) || (await this.currentBlockHeight());
        const mainTransactionsQuery = {
            tags: [
                {
                    name: KnownTags_1.SMART_WEAVE_TAGS.APP_NAME,
                    values: ['SmartWeaveAction']
                },
                {
                    name: KnownTags_1.SMART_WEAVE_TAGS.CONTRACT_TX_ID,
                    values: [contractId]
                },
                {
                    name: KnownTags_1.WARP_TAGS.SEQUENCER,
                    values: ['RedStone']
                }
            ],
            blockFilter: {
                min: fromBlockHeight,
                max: toBlockHeight + EMPIRIC_BUNDLR_FINALITY_TIME
            },
            first: MAX_REQUEST
        };
        const loadingBenchmark = Benchmark_1.Benchmark.measure();
        let interactions = await this.arweaveFetcher.transactions(mainTransactionsQuery);
        if (evaluationOptions.internalWrites) {
            interactions = await this.appendInternalWriteInteractions(contractId, fromBlockHeight, toBlockHeight, interactions);
        }
        loadingBenchmark.stop();
        this.logger.debug('All loaded interactions:', {
            from: fromSortKey,
            to: toSortKey,
            loaded: interactions.length,
            time: loadingBenchmark.elapsed()
        });
        // add sortKey from sequencer tag
        interactions.forEach((interaction) => {
            var _a, _b, _c, _d;
            interaction.node.sortKey =
                (_a = interaction.node.sortKey) !== null && _a !== void 0 ? _a : (_d = (_c = (_b = interaction.node) === null || _b === void 0 ? void 0 : _b.tags) === null || _c === void 0 ? void 0 : _c.find((tag) => tag.name === KnownTags_1.WARP_TAGS.SEQUENCER_SORT_KEY)) === null || _d === void 0 ? void 0 : _d.value;
        });
        const sortedInteractions = await this.sorter.sort(interactions);
        const isLocalOrTestnetEnv = this.environment === 'local' || this.environment === 'testnet';
        const vrfPlugin = this._warp.maybeLoadPlugin('vrf');
        return sortedInteractions
            .filter((interaction) => this.isNewerThenSortKeyBlockHeight(interaction))
            .filter((interaction) => this.isSortKeyInBounds(fromSortKey, toSortKey, interaction))
            .map((interaction) => this.attachSequencerDataToInteraction(interaction))
            .map((interaction) => this.maybeAddMockVrf(isLocalOrTestnetEnv, interaction, vrfPlugin))
            .map((interaction, index, allInteractions) => this.verifySortKeyIntegrity(interaction, index, allInteractions))
            .map(({ node: interaction }) => interaction);
    }
    verifySortKeyIntegrity(interaction, index, allInteractions) {
        var _a;
        if (index !== 0) {
            const prevInteraction = allInteractions[index - 1];
            const nextInteraction = allInteractions[index];
            this.logger.debug(`prev: ${prevInteraction.node.id} | current: ${nextInteraction.node.id}`);
            if (nextInteraction.node.block.height <= LAST_SORT_KEY_MIN_HEIGHT) {
                return interaction;
            }
            if (((_a = nextInteraction.node.lastSortKey) === null || _a === void 0 ? void 0 : _a.split(',')[1]) === LexicographicalInteractionsSorter_1.defaultArweaveMs) {
                // cannot verify this one
                return interaction;
            }
            if (prevInteraction.node.source === 'redstone-sequencer' &&
                prevInteraction.node.sortKey !== nextInteraction.node.lastSortKey) {
                this.logger.warn(`Interaction loading error: interaction ${nextInteraction.node.id} lastSortKey is not pointing on prev interaction ${prevInteraction.node.id}`);
            }
        }
        return interaction;
    }
    isSortKeyInBounds(fromSortKey, toSortKey, interaction) {
        if (fromSortKey && toSortKey) {
            return (interaction.node.sortKey.localeCompare(fromSortKey) > 0 &&
                interaction.node.sortKey.localeCompare(toSortKey) <= 0);
        }
        else if (fromSortKey && !toSortKey) {
            return interaction.node.sortKey.localeCompare(fromSortKey) > 0;
        }
        else if (!fromSortKey && toSortKey) {
            return interaction.node.sortKey.localeCompare(toSortKey) <= 0;
        }
        return true;
    }
    attachSequencerDataToInteraction(interaction) {
        const extractTag = (tagName) => { var _a; return (_a = interaction.node.tags.find((tag) => tag.name === tagName)) === null || _a === void 0 ? void 0 : _a.value; };
        const sequencerTxId = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_TX_ID);
        const sequencerOwner = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_OWNER);
        const sequencerBlockId = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_BLOCK_ID);
        const sequencerBlockHeight = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_BLOCK_HEIGHT);
        const sequencerLastSortKey = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_PREV_SORT_KEY) || extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_LAST_SORT_KEY);
        const sequencerSortKey = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_SORT_KEY);
        // this field was added in sequencer from 15.03.2023
        const sequencerBlockTimestamp = extractTag(KnownTags_1.WARP_TAGS.SEQUENCER_BLOCK_TIMESTAMP);
        const parsedBlockHeight = (0, utils_1.safeParseInt)(sequencerBlockHeight);
        if (!sequencerOwner ||
            !sequencerBlockId ||
            !sequencerBlockHeight ||
            // note: old sequencer transactions do not have last sort key set
            (!sequencerLastSortKey && parsedBlockHeight > LAST_SORT_KEY_MIN_HEIGHT) ||
            !sequencerTxId ||
            !sequencerSortKey) {
            throw Error(`Interaction ${interaction.node.id} is not sequenced by sequencer aborting. Only Sequenced transactions are supported by loader ${ArweaveGatewayBundledInteractionLoader.name}`);
        }
        return {
            ...interaction,
            node: {
                ...interaction.node,
                owner: { address: sequencerOwner, key: null },
                block: {
                    ...interaction.node.block,
                    height: (0, utils_1.safeParseInt)(sequencerBlockHeight),
                    id: sequencerBlockId,
                    timestamp: sequencerBlockTimestamp ? (0, utils_1.safeParseInt)(sequencerBlockTimestamp) : interaction.node.block.timestamp
                },
                sortKey: sequencerSortKey,
                lastSortKey: sequencerLastSortKey,
                id: sequencerTxId,
                source: 'redstone-sequencer'
            }
        };
    }
    async appendInternalWriteInteractions(contractId, fromBlockHeight, toBlockHeight, interactions) {
        const innerWritesVariables = {
            tags: [
                {
                    name: KnownTags_1.WARP_TAGS.INTERACT_WRITE,
                    values: [contractId]
                }
            ],
            blockFilter: {
                min: fromBlockHeight,
                max: toBlockHeight
            },
            first: MAX_REQUEST
        };
        const innerWritesInteractions = await this.arweaveFetcher.transactions(innerWritesVariables);
        this.logger.debug('Inner writes interactions length:', innerWritesInteractions.length);
        interactions = interactions.concat(innerWritesInteractions);
        return interactions;
    }
    maybeAddMockVrf(isLocalOrTestnetEnv, interaction, vrfPlugin) {
        if (isLocalOrTestnetEnv) {
            if (this.tagsParser.hasVrfTag(interaction.node)) {
                if (vrfPlugin) {
                    interaction.node.vrf = vrfPlugin.process().generateMockVrf(interaction.node.sortKey);
                }
                else {
                    this.logger.warn('Cannot generate mock vrf for interaction - no "warp-contracts-plugin-vrf" attached!');
                }
            }
        }
        return interaction;
    }
    isNewerThenSortKeyBlockHeight(interaction) {
        if (interaction.node.sortKey) {
            const blockHeightSortKey = interaction.node.sortKey.split(',')[0];
            const sendToBundlerBlockHeight = Number.parseInt(blockHeightSortKey);
            const finalizedBlockHeight = Number(interaction.node.block.height);
            const blockHeightDiff = finalizedBlockHeight - sendToBundlerBlockHeight;
            return blockHeightDiff >= 0;
        }
        return true;
    }
    async currentBlockHeight() {
        const info = await this.arweaveWrapper.info();
        return info.height;
    }
    type() {
        return 'arweave';
    }
    clearCache() {
        // noop
    }
    set warp(warp) {
        this.arweaveWrapper = new ArweaveWrapper_1.ArweaveWrapper(warp);
        this.arweaveFetcher = new ArweaveGQLTxsFetcher_1.ArweaveGQLTxsFetcher(warp);
        this._warp = warp;
    }
}
exports.ArweaveGatewayBundledInteractionLoader = ArweaveGatewayBundledInteractionLoader;
//# sourceMappingURL=ArweaveGatewayBundledInteractionLoader.js.map