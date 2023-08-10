import { SortKeyCacheResult } from '../cache/SortKeyCache';
import { ContractCallRecord } from '../core/ContractCallRecord';
import { InteractionResult } from '../core/modules/impl/HandlerExecutorFactory';
import { EvaluationOptions, EvalStateResult } from '../core/modules/StateEvaluator';
import { GQLNodeInterface } from '../legacy/gqlResult';
import { ArTransfer, Tags, ArWallet } from './deploy/CreateContract';
import { CustomSignature } from './Signature';
import { EvaluationOptionsEvaluator } from './EvaluationOptionsEvaluator';
import { InteractionState } from './states/InteractionState';
import { Signer } from 'warp-arbundles';

export type BenchmarkStats = { gatewayCommunication: number; stateEvaluation: number; total: number };

interface BundlrResponse {
  id: string;
  public: string;
  signature: string;
  block: number;
}

export interface WriteInteractionResponse {
  bundlrResponse?: BundlrResponse;
  originalTxId: string;
}

export interface DREContractStatusResponse<State> {
  status: string;
  contractTxId: string;
  state: State;
  validity: Record<string, boolean>;
  errorMessages: Record<string, string>;
  sortKey: string;
  timestamp: string;
  signature: string;
  stateHash: string;
}

export type WarpOptions = {
  vrf?: boolean;
  disableBundling?: boolean;
};

export type ArweaveOptions = {
  transfer?: ArTransfer;
  reward?: string;
};

export type CommonOptions = {
  tags?: Tags;
  strict?: boolean;
};

export type WriteInteractionOptions = WarpOptions & ArweaveOptions & CommonOptions;
/**
 * Interface describing state for all Evolve-compatible contracts.
 */
export interface EvolveState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- compatibility with smartweave
  settings: any[] | unknown | null;
  /**
   * whether contract is allowed to evolve.
   */
  canEvolve: boolean;

  /**
   * the transaction id of the Arweave transaction with the updated source code.
   */
  evolve: string;
}

export type InnerCallType = 'read' | 'view' | 'write';

export type InnerCallData = { callingInteraction: GQLNodeInterface; callType: InnerCallType };

/**
 * A base interface to be implemented by SmartWeave Contracts clients
 * - contains "low-level" methods that allow to interact with any contract
 */
export interface Contract<State = unknown> {
  /**
   * Returns the Arweave transaction id of this contract.
   */
  txId(): string;

  /**
   * Allows to connect a signer to a contract.
   * Connecting a signer MAY be done before "viewState" (depending on contract implementation,
   * i.e. whether called contract's function required "caller" info)
   * Connecting a signer MUST be done before "writeInteraction" and "bundleInteraction".
   *
   * @param signer - either {@link ArWallet} that will be connected to this contract, custom {@link SigningFunction} or {@link Signer}
   */
  connect(signature: ArWallet | CustomSignature | Signer): Contract<State>;

  /**
   * Allows to set ({@link EvaluationOptions})
   *
   * @param options - a set of {@link EvaluationOptions} that will overwrite current configuration
   */
  setEvaluationOptions(options: Partial<EvaluationOptions>): Contract<State>;

  /**
   * Returns state of the contract at required sortKey or blockHeight.
   *
   * @param sortKeyOrBlockHeight - either a sortKey or block height at which the contract should be read
   *
   * @param currentTx - a set of currently evaluating interactions, that should
   * be skipped during contract inner calls - to prevent the infinite call loop issue
   * (mostly related to contract that use the Foreign Call Protocol)
   */
  readState(
    sortKeyOrBlockHeight?: string | number,
    caller?: string,
    interactions?: GQLNodeInterface[]
  ): Promise<SortKeyCacheResult<EvalStateResult<State>>>;

  readStateFor(sortKey: string, interactions: GQLNodeInterface[]): Promise<SortKeyCacheResult<EvalStateResult<State>>>;

  /**
   * Returns the "view" of the state, computed by the SWC -
   * i.e. object that is a derivative of a current state and some specific
   * smart contract business logic.
   * Similar to the "interactRead" from the current SDK version.
   *
   * This method firstly evaluates the contract state to the requested block height.
   * Having the contract state on this block height - it then calls the contract's code
   * with specified input.
   *
   * @param input - the input to the contract - eg. function name and parameters
   * @param tags - a set of tags that can be added to the interaction transaction
   * @param transfer - additional {@link ArTransfer} data that can be attached to the interaction
   * @param caller - caller of the view state operation
   * transaction
   */
  viewState<Input = unknown, View = unknown>(
    input: Input,
    tags?: Tags,
    transfer?: ArTransfer,
    caller?: string
  ): Promise<InteractionResult<State, View>>;

  /**
   * A version of the viewState method to be used from within the contract's source code.
   * The transaction passed as an argument is the currently processed interaction transaction.
   * The "caller" will be se to the owner of the interaction transaction, that
   * requires to call this method.
   *
   * note: calling "interactRead" from withing contract's source code was not previously possible -
   * this is a new feature.
   *
   * TODO: this should not be exposed in a public API - as it is supposed
   * to be used only by Handler code.
   */
  viewStateForTx<Input = unknown, View = unknown>(
    input: Input,
    transaction: GQLNodeInterface
  ): Promise<InteractionResult<State, View>>;

  /**
   * A dry-write operation on contract. It first loads the contract's state and then
   * creates a "dummy" transaction and applies the given Input on top of the current contract's
   * state.
   * @param input - input to be applied on the current contract's state
   * @param tags - additional tags to be added to interaction transaction
   * @param transfer - additional {@link ArTransfer} data to be associated with the "dummy" transaction
   * @param caller - an option to override the caller - if available, this value will overwrite the caller evaluated
   * from the wallet connected to this contract.
   * @param vrf - whether a mock VRF data should be generated
   */
  dryWrite<Input>(
    input: Input,
    caller?: string,
    tags?: Tags,
    transfer?: ArTransfer,
    vrf?: boolean
  ): Promise<InteractionResult<State, unknown>>;

  applyInput<Input>(input: Input, transaction: GQLNodeInterface): Promise<InteractionResult<State, unknown>>;

  /**
   * Writes a new "interaction" transaction - i.e. such transaction that stores input for the contract.
   */
  writeInteraction<Input = unknown>(
    input: Input,
    options?: WriteInteractionOptions
  ): Promise<WriteInteractionResponse | null>;

  /**
   * Returns the full call tree report the last
   * interaction with contract (eg. after reading state)
   */
  getCallStack(): ContractCallRecord;

  /**
   * Gets the parent contract - ie. contract that called THIS contract during the
   * state evaluation.
   */
  parent(): Contract | null;

  /**
   * Return the depth of the call to this contract.
   * E.g.
   * 1. User calls ContractA.readState() - depth = 0
   * 2. ContractA.readState() calls ContractB.readState() - depth = 1
   * 3. ContractB.readState calls ContractC.readState() - depth = 2
   */
  callDepth(): number;

  /**
   * {@link EvaluationOptions} assigned to this contract.
   * The evaluation options for the child contracts are always
   * the same as the evaluation options of the root contract.
   */
  evaluationOptions(): EvaluationOptions;

  /**
   * returns benchmark results for the last performed readState call
   */
  lastReadStateStats(): BenchmarkStats;

  /**
   * calculates state hash using stable stringify
   */
  stateHash(state: State): Promise<string>;

  /**
   * this method allows to sync the state of the local SDK state with the state provided by an external endpoint;
   * @param externalUrl - external endpoint url
   * @param params - by default only query param with `contractId` is set by SDK, any additional ones can be passed
   * in the `params` object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- params can be anything
  syncState(externalUrl: string, params?: any): Promise<Contract>;

  /**
   * Evolve is a feature that allows to change contract's source
   * code, without having to deploy a new contract.
   * This method effectively evolves the contract to the source.
   * This requires the {@link save} to be called first
   * and its transaction to be confirmed by the network.
   * @param newSrcTxId - result of the {@link save} method call.
   */
  evolve(newSrcTxId: string, options?: WriteInteractionOptions): Promise<WriteInteractionResponse | null>;

  rootSortKey: string;

  getRootEoEvaluator(): EvaluationOptionsEvaluator;

  isRoot(): boolean;

  getStorageValues(keys: string[]): Promise<SortKeyCacheResult<Map<string, unknown>>>;

  interactionState(): InteractionState;
}
