import { SortKeyCacheResult } from '../../cache/SortKeyCache';
import { ExecutionContext } from '../ExecutionContext';
import { GQLNodeInterface } from '../../legacy/gqlResult';
import { SourceType } from './impl/WarpGatewayInteractionsLoader';
import { BasicSortKeyCache } from '../../cache/BasicSortKeyCache';

/**
 * Implementors of this class are responsible for evaluating contract's state
 * - based on the {@link ExecutionContext}.
 */
export interface StateEvaluator {
  eval<State>(executionContext: ExecutionContext<State>): Promise<SortKeyCacheResult<EvalStateResult<State>>>;

  /**
   * a hook that is called on each state update (i.e. after evaluating state for each interaction transaction)
   */
  onStateUpdate<State>(
    transaction: GQLNodeInterface,
    executionContext: ExecutionContext<State>,
    state: EvalStateResult<State>,
    force?: boolean
  ): Promise<void>;

  /**
   * a hook that is called after state has been fully evaluated
   */
  onStateEvaluated<State>(
    transaction: GQLNodeInterface,
    executionContext: ExecutionContext<State>,
    state: EvalStateResult<State>
  ): Promise<void>;

  /**
   * a hook that is called after performing internal write between contracts
   */
  onInternalWriteStateUpdate<State>(
    transaction: GQLNodeInterface,
    contractTxId: string,
    state: EvalStateResult<State>
  ): Promise<void>;

  /**
   * a hook that is called before communicating with other contract.
   * note to myself: putting values into cache only "onContractCall" may degrade performance.
   * For example:
   * 1. block 722317 - contract A calls B
   * 2. block 722727 - contract A calls B
   * 3. block 722695 - contract B calls A
   * If we update cache only on contract call - for the last above call (B->A)
   * we would retrieve state cached for 722317. If there are any transactions
   * between 722317 and 722695 - the performance will be degraded.
   */
  onContractCall<State>(
    transaction: GQLNodeInterface,
    executionContext: ExecutionContext<State>,
    state: EvalStateResult<State>
  ): Promise<void>;

  /**
   * loads the latest available state for given contract for given sortKey.
   */
  latestAvailableState<State>(
    contractTxId: string,
    sortKey?: string
  ): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;

  putInCache<State>(contractTxId: string, transaction: GQLNodeInterface, state: EvalStateResult<State>): Promise<void>;

  /**
   * allows to syncState with an external state source (like Warp Distributed Execution Network)
   */
  syncState<State>(
    contractTxId: string,
    sortKey: string,
    state: State,
    validity: Record<string, boolean>
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>>;

  internalWriteState<State>(
    contractTxId: string,
    sortKey: string
  ): Promise<SortKeyCacheResult<EvalStateResult<State>> | null>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dumpCache(): Promise<any>;

  hasContractCached(contractTxId: string): Promise<boolean>;

  lastCachedSortKey(): Promise<string | null>;

  setCache(cache: BasicSortKeyCache<EvalStateResult<unknown>>): void;

  getCache(): BasicSortKeyCache<EvalStateResult<unknown>>;
}

export class EvalStateResult<State> {
  constructor(
    readonly state: State,
    readonly validity: Record<string, boolean>,
    readonly errorMessages: Record<string, string>,
    readonly result?: any
  ) {}
}

export type UnsafeClientOptions = 'allow' | 'skip' | 'throw';

export class DefaultEvaluationOptions implements EvaluationOptions {
  // default = true - still cannot decide whether true or false should be the default.
  // "false" may lead to some fairly simple attacks on contract, if the contract
  // does not properly validate input data.
  // "true" may lead to wrongly calculated state, even without noticing the problem
  // (e.g. when using unsafe client and Arweave does not respond properly for a while)
  ignoreExceptions = true;

  waitForConfirmation = false;

  updateCacheForEachInteraction = false;

  internalWrites = false;

  maxCallDepth = 7; // your lucky number...

  maxInteractionEvaluationTimeSeconds = 60;

  stackTrace = {
    saveState: false
  };

  sequencerUrl = `https://d1o5nlqr4okus2.cloudfront.net/`;

  gasLimit = Number.MAX_SAFE_INTEGER;

  sourceType = SourceType.BOTH;

  unsafeClient = 'throw' as const;

  allowBigInt = false;

  walletBalanceUrl = 'http://nyc-1.dev.arweave.net:1984/';

  mineArLocalBlocks = true;

  throwOnInternalWriteError = true;

  cacheEveryNInteractions = -1;

  useKVStorage = false;

  remoteStateSyncEnabled = false;

  remoteStateSyncSource = 'https://dre-1.warp.cc/contract';

  useConstructor = false;
}

// an interface for the contract EvaluationOptions - can be used to change the behaviour of some features.
export interface EvaluationOptions {
  // whether exceptions from given transaction interaction should be ignored
  ignoreExceptions: boolean;

  // allow to wait for confirmation of the interaction transaction - this way
  // you will know, when the new interaction is effectively available on the network
  waitForConfirmation: boolean;

  // whether the state cache should be updated after evaluating each interaction transaction.
  // currently, defaults to false. Setting to true might in some scenarios increase evaluation performance
  // - but at a cost of higher memory usage.
  // It is also currently required by the "internalWrites" feature.
  // By default, the state cache is updated
  // 1. before calling "read" on other contract (as the calling contract might require callee contract state
  // - quite often scenario in FCP)
  // 2. after evaluating all the contract interactions.

  // https://github.com/redstone-finance/warp/issues/53
  updateCacheForEachInteraction: boolean;

  // a new, experimental enhancement of the protocol that allows for interactWrites from
  // smart contract's source code.
  internalWrites: boolean;

  // the maximum call depth between contracts
  // eg. ContractA calls ContractB,
  // then ContractB calls ContractC,
  // then ContractC calls ContractD
  // - call depth = 3
  // this is added as a protection from "stackoverflow" errors
  maxCallDepth: number;

  // the maximum evaluation time of a single interaction transaction
  maxInteractionEvaluationTimeSeconds: number;

  // a set of options that control the behaviour of the stack trace generator
  stackTrace: {
    // whether output state should be saved for each interaction in the stack trace (may result in huuuuge json files!)
    saveState: boolean;
  };

  sequencerUrl: string;

  gasLimit: number;

  // Whether using unsafe client should be allowed
  // allow - allows to evaluate contracts with SmartWeave.unsafeClient calls
  // skip - skips all the transactions the make calls to unsafeClient (including all nested calls)
  // throw - throws and stops evaluation whenever unsafeClient is being used
  unsafeClient: UnsafeClientOptions;

  // whether using BigInt in contract code is allowed. Defaults to false
  // as by default BigInt cannot be serialized to json.
  allowBigInt: boolean;

  // an endpoint for retrieving wallet balance info
  walletBalanceUrl: string;

  // Whether interactions should be taken from {@link SourceType.ARWEAVE} or {@link SourceType.WARP_SEQUENCER}.
  // By default it is {@link SourceType.BOTH}
  sourceType: SourceType;

  // whether the local Warp instance should manually mine blocks in ArLocal. Defaults to true.
  mineArLocalBlocks: boolean;

  // whether a contract should automatically throw if internal write fails.
  // set to 'true' be default, can be set to false for backwards compatibility
  throwOnInternalWriteError: boolean;

  // force SDK to cache the state after evaluating each N interactions
  // defaults to -1, which effectively turns off this feature
  cacheEveryNInteractions: number;

  // whether a separate key-value storage should be used for the contract
  useKVStorage: boolean;

  // If set to true, __init function will be called before any interaction on first evaluation of contract.
  // Contract has to expose __init function in handler.
  useConstructor: boolean;

  // whether contract state should be acquired from remote source, e.g. D.R.E.
  remoteStateSyncEnabled: boolean;

  // remote source for fetching most recent contract state, only applicable if remoteStateSyncEnabled is set to true
  remoteStateSyncSource: string;
}
