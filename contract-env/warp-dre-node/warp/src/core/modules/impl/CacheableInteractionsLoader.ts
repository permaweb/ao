import { GQLNodeInterface } from '../../../legacy/gqlResult';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { InteractionsLoader, GW_TYPE } from '../InteractionsLoader';
import { EvaluationOptions } from '../StateEvaluator';
import { Warp } from '../../Warp';

export class CacheableInteractionsLoader implements InteractionsLoader {
  private readonly logger = LoggerFactory.INST.create('CacheableInteractionsLoader');
  private readonly interactionsCache: Map<string, GQLNodeInterface[]> = new Map();

  constructor(private readonly delegate: InteractionsLoader) {}

  async load(
    contractTxId: string,
    fromSortKey?: string,
    toSortKey?: string,
    evaluationOptions?: EvaluationOptions
  ): Promise<GQLNodeInterface[]> {
    this.logger.debug(`Loading interactions for`, {
      contractTxId,
      fromSortKey,
      toSortKey
    });

    if (!this.interactionsCache.has(contractTxId)) {
      const interactions = await this.delegate.load(contractTxId, fromSortKey, toSortKey, evaluationOptions);
      if (interactions.length) {
        this.interactionsCache.set(contractTxId, interactions);
      }
      return interactions;
    } else {
      const cachedInteractions = this.interactionsCache.get(contractTxId);
      if (cachedInteractions?.length) {
        const lastCachedKey = cachedInteractions[cachedInteractions.length - 1].sortKey;
        if (lastCachedKey.localeCompare(toSortKey) < 0) {
          const missingInteractions = await this.delegate.load(
            contractTxId,
            lastCachedKey,
            toSortKey,
            evaluationOptions
          );
          const allInteractions = cachedInteractions.concat(missingInteractions);
          this.interactionsCache.set(contractTxId, allInteractions);
          return allInteractions;
        }
      }

      return cachedInteractions;
    }
  }

  type(): GW_TYPE {
    return this.delegate.type();
  }

  clearCache(): void {
    this.interactionsCache.clear();
  }

  set warp(warp: Warp) {
    this.delegate.warp = warp;
  }
}
