import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { Benchmark } from '../../../logging/Benchmark';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import 'warp-isomorphic';
import { getJsonResponse, stripTrailingSlash } from '../../../utils/utils';
import { GW_TYPE, InteractionsLoader } from '../InteractionsLoader';
import { EvaluationOptions } from '../StateEvaluator';
import { Warp } from '../../Warp';

export type ConfirmationStatus =
  | {
      notCorrupted?: boolean;
      confirmed?: null;
    }
  | {
      notCorrupted?: null;
      confirmed?: boolean;
    };

export const enum SourceType {
  ARWEAVE = 'arweave',
  WARP_SEQUENCER = 'redstone-sequencer',
  BOTH = 'both'
}

type InteractionsResult = {
  interactions: GQLNodeInterface[];
  paging: {
    limit: number;
    items: number;
  };
};

/**
 * The aim of this implementation of the {@link InteractionsLoader} is to make use of
 * Warp Gateway ({@link https://github.com/redstone-finance/redstone-sw-gateway})
 * endpoint and retrieve contracts' interactions.
 *
 * Optionally - it is possible to pass:
 * 1. {@link ConfirmationStatus.confirmed} flag - to receive only confirmed interactions - ie. interactions with
 * enough confirmations, whose existence is confirmed by at least 3 Arweave peers.
 * 2. {@link ConfirmationStatus.notCorrupted} flag - to receive both already confirmed and not yet confirmed (ie. latest)
 * interactions.
 * 3. {@link SourceType} - to receive interactions based on their origin ({@link SourceType.ARWEAVE} or {@link SourceType.WARP_SEQUENCER}).
 * If not set, by default {@link SourceType.BOTH} is set.
 *
 * Passing no flag is the "backwards compatible" mode (ie. it will behave like the original Arweave GQL gateway endpoint).
 * Note that this may result in returning corrupted and/or forked interactions
 * - read more {@link https://github.com/warp-contracts/redstone-sw-gateway#corrupted-transactions}.
 */
export class WarpGatewayInteractionsLoader implements InteractionsLoader {
  private _warp: Warp;

  constructor(
    private readonly confirmationStatus: ConfirmationStatus = null,
    private readonly source: SourceType = SourceType.BOTH
  ) {
    Object.assign(this, confirmationStatus);
    this.source = source;
  }

  private readonly logger = LoggerFactory.INST.create('WarpGatewayInteractionsLoader');

  async load(
    contractId: string,
    fromSortKey?: string,
    toSortKey?: string,
    evaluationOptions?: EvaluationOptions
  ): Promise<GQLNodeInterface[]> {
    this.logger.debug('Loading interactions: for ', { contractId, fromSortKey, toSortKey });

    const interactions: GQLNodeInterface[] = [];
    let page = 0;
    let limit = 0;
    let items = 0;

    const effectiveSourceType = evaluationOptions ? evaluationOptions.sourceType : this.source;
    const benchmarkTotalTime = Benchmark.measure();
    const baseUrl = stripTrailingSlash(this._warp.gwUrl());

    do {
      const benchmarkRequestTime = Benchmark.measure();

      const url = `${baseUrl}/gateway/v2/interactions-sort-key`;

      const response = await getJsonResponse<InteractionsResult>(
        fetch(
          `${url}?${new URLSearchParams({
            contractId: contractId,
            ...(this._warp.whoAmI ? { client: this._warp.whoAmI } : ''),
            ...(fromSortKey ? { from: fromSortKey } : ''),
            ...(toSortKey ? { to: toSortKey } : ''),
            page: (++page).toString(),
            fromSdk: 'true',
            ...(this.confirmationStatus && this.confirmationStatus.confirmed
              ? { confirmationStatus: 'confirmed' }
              : ''),
            ...(this.confirmationStatus && this.confirmationStatus.notCorrupted
              ? { confirmationStatus: 'not_corrupted' }
              : ''),
            ...(effectiveSourceType == SourceType.BOTH ? '' : { source: effectiveSourceType })
          })}`
        )
      );
      this.logger.debug(`Loading interactions: page ${page} loaded in ${benchmarkRequestTime.elapsed()}`);

      interactions.push(...response.interactions);
      limit = response.paging.limit;
      items = response.paging.items;

      this.logger.debug(`Loaded interactions length: ${interactions.length}, from: ${fromSortKey}, to: ${toSortKey}`);
    } while (items == limit); // note: items < limit means that we're on the last page

    this.logger.debug('All loaded interactions:', {
      from: fromSortKey,
      to: toSortKey,
      loaded: interactions.length,
      time: benchmarkTotalTime.elapsed()
    });

    return interactions;
  }

  type(): GW_TYPE {
    return 'warp';
  }

  clearCache(): void {
    // noop
  }

  set warp(warp: Warp) {
    this._warp = warp;
  }
}
