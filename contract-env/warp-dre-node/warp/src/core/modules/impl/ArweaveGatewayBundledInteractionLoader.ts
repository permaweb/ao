import Arweave from 'arweave';
import { SMART_WEAVE_TAGS, WARP_TAGS, WarpTags } from '../../KnownTags';
import { GQLEdgeInterface, GQLNodeInterface } from '../../../legacy/gqlResult';
import { Benchmark } from '../../../logging/Benchmark';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { ArweaveWrapper } from '../../../utils/ArweaveWrapper';
import { GW_TYPE, InteractionsLoader } from '../InteractionsLoader';
import { InteractionsSorter } from '../InteractionsSorter';
import { EvaluationOptions } from '../StateEvaluator';
import { defaultArweaveMs, LexicographicalInteractionsSorter } from './LexicographicalInteractionsSorter';
import { Warp, WarpEnvironment } from '../../Warp';
import { Tag } from 'utils/types/arweave-types';
import { ArweaveGQLTxsFetcher } from './ArweaveGQLTxsFetcher';
import { safeParseInt } from '../../../utils/utils';
import { VrfPluginFunctions, WarpPlugin } from '../../WarpPlugin';
import { TagsParser } from './TagsParser';

const MAX_REQUEST = 100;
// SortKey.blockHeight is block height
// at which interaction was sent to bundler
// it can be actually finalized in later block
// we assume that this maximal "delay"
const EMPIRIC_BUNDLR_FINALITY_TIME = 100;

interface TagFilter {
  name: string;
  values: string[];
}

interface BlockFilter {
  min?: number;
  max?: number;
}

export interface GqlReqVariables {
  tags: TagFilter[];
  blockFilter: BlockFilter;
  first: number;
  after?: string;
}

// a height from which the last sort key value is being set by the sequencer
const LAST_SORT_KEY_MIN_HEIGHT = 1057409;

export class ArweaveGatewayBundledInteractionLoader implements InteractionsLoader {
  private readonly logger = LoggerFactory.INST.create(ArweaveGatewayBundledInteractionLoader.name);

  private arweaveFetcher: ArweaveGQLTxsFetcher;
  private arweaveWrapper: ArweaveWrapper;
  private _warp: Warp;
  private readonly sorter: InteractionsSorter;
  private readonly tagsParser = new TagsParser();

  constructor(protected readonly arweave: Arweave, private readonly environment: WarpEnvironment) {
    this.sorter = new LexicographicalInteractionsSorter(arweave);
  }

  async load(
    contractId: string,
    fromSortKey?: string,
    toSortKey?: string,
    evaluationOptions?: EvaluationOptions
  ): Promise<GQLNodeInterface[]> {
    this.logger.debug('Loading interactions for', { contractId, fromSortKey, toSortKey });

    const fromBlockHeight = this.sorter.extractBlockHeight(fromSortKey) || 0;
    const toBlockHeight = this.sorter.extractBlockHeight(toSortKey) || (await this.currentBlockHeight());

    const mainTransactionsQuery: GqlReqVariables = {
      tags: [
        {
          name: SMART_WEAVE_TAGS.APP_NAME,
          values: ['SmartWeaveAction']
        },
        {
          name: SMART_WEAVE_TAGS.CONTRACT_TX_ID,
          values: [contractId]
        },
        {
          name: WARP_TAGS.SEQUENCER,
          values: ['RedStone']
        }
      ],
      blockFilter: {
        min: fromBlockHeight,
        max: toBlockHeight + EMPIRIC_BUNDLR_FINALITY_TIME
      },
      first: MAX_REQUEST
    };

    const loadingBenchmark = Benchmark.measure();
    let interactions = await this.arweaveFetcher.transactions(mainTransactionsQuery);

    if (evaluationOptions.internalWrites) {
      interactions = await this.appendInternalWriteInteractions(
        contractId,
        fromBlockHeight,
        toBlockHeight,
        interactions
      );
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
      interaction.node.sortKey =
        interaction.node.sortKey ??
        interaction.node?.tags?.find((tag: Tag) => tag.name === WARP_TAGS.SEQUENCER_SORT_KEY)?.value;
    });

    const sortedInteractions = await this.sorter.sort(interactions);
    const isLocalOrTestnetEnv = this.environment === 'local' || this.environment === 'testnet';
    const vrfPlugin = this._warp.maybeLoadPlugin<void, VrfPluginFunctions>('vrf');

    return sortedInteractions
      .filter((interaction) => this.isNewerThenSortKeyBlockHeight(interaction))
      .filter((interaction) => this.isSortKeyInBounds(fromSortKey, toSortKey, interaction))
      .map((interaction) => this.attachSequencerDataToInteraction(interaction))
      .map((interaction) => this.maybeAddMockVrf(isLocalOrTestnetEnv, interaction, vrfPlugin))
      .map((interaction, index, allInteractions) => this.verifySortKeyIntegrity(interaction, index, allInteractions))
      .map(({ node: interaction }) => interaction);
  }

  private verifySortKeyIntegrity(
    interaction: GQLEdgeInterface,
    index: number,
    allInteractions: GQLEdgeInterface[]
  ): GQLEdgeInterface {
    if (index !== 0) {
      const prevInteraction = allInteractions[index - 1];
      const nextInteraction = allInteractions[index];

      this.logger.debug(`prev: ${prevInteraction.node.id} | current: ${nextInteraction.node.id}`);

      if (nextInteraction.node.block.height <= LAST_SORT_KEY_MIN_HEIGHT) {
        return interaction;
      }
      if (nextInteraction.node.lastSortKey?.split(',')[1] === defaultArweaveMs) {
        // cannot verify this one
        return interaction;
      }

      if (
        prevInteraction.node.source === 'redstone-sequencer' &&
        prevInteraction.node.sortKey !== nextInteraction.node.lastSortKey
      ) {
        this.logger.warn(
          `Interaction loading error: interaction ${nextInteraction.node.id} lastSortKey is not pointing on prev interaction ${prevInteraction.node.id}`
        );
      }
    }

    return interaction;
  }

  private isSortKeyInBounds(fromSortKey: string, toSortKey: string, interaction: GQLEdgeInterface): boolean {
    if (fromSortKey && toSortKey) {
      return (
        interaction.node.sortKey.localeCompare(fromSortKey) > 0 &&
        interaction.node.sortKey.localeCompare(toSortKey) <= 0
      );
    } else if (fromSortKey && !toSortKey) {
      return interaction.node.sortKey.localeCompare(fromSortKey) > 0;
    } else if (!fromSortKey && toSortKey) {
      return interaction.node.sortKey.localeCompare(toSortKey) <= 0;
    }
    return true;
  }

  private attachSequencerDataToInteraction(interaction: GQLEdgeInterface): GQLEdgeInterface {
    const extractTag = (tagName: WarpTags) => interaction.node.tags.find((tag: Tag) => tag.name === tagName)?.value;

    const sequencerTxId = extractTag(WARP_TAGS.SEQUENCER_TX_ID);

    const sequencerOwner = extractTag(WARP_TAGS.SEQUENCER_OWNER);
    const sequencerBlockId = extractTag(WARP_TAGS.SEQUENCER_BLOCK_ID);
    const sequencerBlockHeight = extractTag(WARP_TAGS.SEQUENCER_BLOCK_HEIGHT);
    const sequencerLastSortKey =
      extractTag(WARP_TAGS.SEQUENCER_PREV_SORT_KEY) || extractTag(WARP_TAGS.SEQUENCER_LAST_SORT_KEY);
    const sequencerSortKey = extractTag(WARP_TAGS.SEQUENCER_SORT_KEY);
    // this field was added in sequencer from 15.03.2023
    const sequencerBlockTimestamp = extractTag(WARP_TAGS.SEQUENCER_BLOCK_TIMESTAMP);

    const parsedBlockHeight = safeParseInt(sequencerBlockHeight);

    if (
      !sequencerOwner ||
      !sequencerBlockId ||
      !sequencerBlockHeight ||
      // note: old sequencer transactions do not have last sort key set
      (!sequencerLastSortKey && parsedBlockHeight > LAST_SORT_KEY_MIN_HEIGHT) ||
      !sequencerTxId ||
      !sequencerSortKey
    ) {
      throw Error(
        `Interaction ${interaction.node.id} is not sequenced by sequencer aborting. Only Sequenced transactions are supported by loader ${ArweaveGatewayBundledInteractionLoader.name}`
      );
    }

    return {
      ...interaction,
      node: {
        ...interaction.node,
        owner: { address: sequencerOwner, key: null },
        block: {
          ...interaction.node.block,
          height: safeParseInt(sequencerBlockHeight),
          id: sequencerBlockId,
          timestamp: sequencerBlockTimestamp ? safeParseInt(sequencerBlockTimestamp) : interaction.node.block.timestamp
        },
        sortKey: sequencerSortKey,
        lastSortKey: sequencerLastSortKey,
        id: sequencerTxId,
        source: 'redstone-sequencer'
      }
    };
  }

  private async appendInternalWriteInteractions(
    contractId: string,
    fromBlockHeight: number,
    toBlockHeight: number,
    interactions: GQLEdgeInterface[]
  ) {
    const innerWritesVariables: GqlReqVariables = {
      tags: [
        {
          name: WARP_TAGS.INTERACT_WRITE,
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

  private maybeAddMockVrf(
    isLocalOrTestnetEnv: boolean,
    interaction: GQLEdgeInterface,
    vrfPlugin?: WarpPlugin<void, VrfPluginFunctions>
  ): GQLEdgeInterface {
    if (isLocalOrTestnetEnv) {
      if (this.tagsParser.hasVrfTag(interaction.node)) {
        if (vrfPlugin) {
          interaction.node.vrf = vrfPlugin.process().generateMockVrf(interaction.node.sortKey);
        } else {
          this.logger.warn('Cannot generate mock vrf for interaction - no "warp-contracts-plugin-vrf" attached!');
        }
      }
    }
    return interaction;
  }

  private isNewerThenSortKeyBlockHeight(interaction: GQLEdgeInterface): boolean {
    if (interaction.node.sortKey) {
      const blockHeightSortKey = interaction.node.sortKey.split(',')[0];

      const sendToBundlerBlockHeight = Number.parseInt(blockHeightSortKey);
      const finalizedBlockHeight = Number(interaction.node.block.height);
      const blockHeightDiff = finalizedBlockHeight - sendToBundlerBlockHeight;
      return blockHeightDiff >= 0;
    }
    return true;
  }

  private async currentBlockHeight(): Promise<number> {
    const info = await this.arweaveWrapper.info();
    return info.height;
  }

  type(): GW_TYPE {
    return 'arweave';
  }

  clearCache(): void {
    // noop
  }

  set warp(warp: Warp) {
    this.arweaveWrapper = new ArweaveWrapper(warp);
    this.arweaveFetcher = new ArweaveGQLTxsFetcher(warp);
    this._warp = warp;
  }
}
