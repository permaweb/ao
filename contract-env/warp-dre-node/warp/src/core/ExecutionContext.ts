import { SortKeyCacheResult } from '../cache/SortKeyCache';
import { Contract } from '../contract/Contract';
import { GQLNodeInterface } from '../legacy/gqlResult';
import { ContractDefinition } from './ContractDefinition';
import { EvaluationOptions, EvalStateResult } from './modules/StateEvaluator';
import { Warp } from './Warp';

/**
 * current execution context of the contract - contains all elements
 * that are required to call contract's code.
 * This has been created to prevent some operations from loading certain data (eg.
 * contract's definition - which is very time consuming) multiple times
 * (eg. multiple calls to "loadContract" in "interactRead" in the current version of the Arweave's smartweave.js).
 */
export type ExecutionContext<State, Api = unknown> = {
  /**
   * {@link Warp} client currently being used
   */
  warp: Warp;
  /**
   * {@link Contract} related to this execution context
   */
  contract: Contract<State>;
  /**
   * The full {@link ContractDefinition} of the {@link Contract}
   */
  contractDefinition: ContractDefinition<State>;
  /**
   * interaction sorted using either {@link LexicographicalInteractionsSorter}
   * - crucial for proper and deterministic state evaluation
   */
  sortedInteractions: GQLNodeInterface[];
  /**
   * evaluation options currently being used
   * TODO: this can be removed, as it should be accessible from the {@link Contract}
   */
  evaluationOptions: EvaluationOptions;
  /**
   * A handle to the contract's "handle" function - ie. main function of the given SWC - that actually
   * performs all the computation.
   */
  handler?: Api;
  caller?: string; // note: this is only set for "viewState" and "write" operations
  cachedState?: SortKeyCacheResult<EvalStateResult<State>>;
  requestedSortKey?: string;
};
