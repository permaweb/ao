import { GQLNodeInterface } from '../../legacy/gqlResult';
import { EvaluationOptions } from './StateEvaluator';
import { WarpAware } from '../Warp';

export type GW_TYPE = 'arweave' | 'warp';

export interface GwTypeAware {
  type(): GW_TYPE;
}

/**
 * Implementors of this interface add functionality of loading contract's interaction transactions.
 * Returned interactions MUST be sorted according to protocol specification ({@link LexicographicalInteractionsSorter}
 */
export interface InteractionsLoader extends GwTypeAware, WarpAware {
  /**
   * This method loads interactions for a given contract.
   * If param fromSortKey and/or param toSortKey are present, the loaded interactions do
   * conform the condition: i.sortKey > fromSortKey && i.sortKey <= toSortKey
   *
   * @param contractTxId - contract tx id to load the interactions
   * @param fromSortKey - exclusive, optional - sortKey, from which the interactions should be loaded
   * @param toSortKey - inclusive, optional - sortKey, to which the interactions should be loaded
   * @param evaluationOptions, optional - {@link EvaluationOptions}
   */
  load(
    contractTxId: string,
    fromSortKey?: string,
    toSortKey?: string,
    evaluationOptions?: EvaluationOptions
  ): Promise<GQLNodeInterface[]>;

  clearCache(): void;
}
