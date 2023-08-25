/* eslint-disable */
import Arweave from 'arweave';
import { EvaluationOptions } from '../core/modules/StateEvaluator';
import { GQLNodeInterface, GQLTagInterface, VrfData } from './gqlResult';
import { CacheKey, SortKeyCache } from '../cache/SortKeyCache';
import { SortKeyCacheRangeOptions } from '../cache/SortKeyCacheRangeOptions';
import { InteractionState } from '../contract/states/InteractionState';

/**
 *
 * This class is exposed as a global for contracts
 * as 'SmartWeave' and provides an API for getting further
 * information or using utility and crypto functions from
 * inside the contracts execution.
 *
 * It provides an api:
 *
 * - SmartWeave.transaction.id
 * - SmartWeave.transaction.reward
 * - SmartWeave.block.height
 * - SmartWeave.block.timestamp
 * - etc
 *
 * and access to some of the arweave utils:
 * - SmartWeave.arweave.utils
 * - SmartWeave.arweave.crypto
 * - SmartWeave.arweave.wallets
 * - SmartWeave.arweave.ar
 *
 * as well as access to the potentially non-deterministic full client:
 * - SmartWeave.unsafeClient
 *
 */

export type TransactionOrigin = 'L1' | 'L2';

export class SmartWeaveGlobal {
  gasUsed: number;
  gasLimit: number;
  transaction: SWTransaction;
  block: SWBlock;
  vrf: SWVrf;
  evaluationOptions: EvaluationOptions;
  arweave: Pick<Arweave, 'ar' | 'wallets' | 'utils' | 'crypto'>;
  contract: {
    id: string;
    owner: string;
  };
  unsafeClient: Arweave;

  contracts: {
    readContractState: (contractId: string) => Promise<any>;
    viewContractState: (contractId: string, input: any) => Promise<any>;
    write: (contractId: string, input: any) => Promise<any>;
    refreshState: () => Promise<any>;
  };

  extensions: any;

  _activeTx?: GQLNodeInterface;

  caller?: string;

  kv: KV;

  constructor(
    arweave: Arweave,
    contract: { id: string; owner: string },
    evaluationOptions: EvaluationOptions,
    interactionState: InteractionState,
    storage: SortKeyCache<any> | null
  ) {
    this.gasUsed = 0;
    this.gasLimit = Number.MAX_SAFE_INTEGER;
    this.unsafeClient = arweave;
    this.arweave = {
      ar: arweave.ar,
      utils: arweave.utils,
      wallets: arweave.wallets,
      crypto: arweave.crypto
    };

    this.evaluationOptions = evaluationOptions;

    this.contract = contract;
    this.transaction = new SWTransaction(this);
    this.block = new SWBlock(this);
    this.contracts = {
      readContractState: (contractId: string, height?: number, returnValidity?: boolean) => {
        throw new Error('Not implemented - should be set by HandlerApi implementor');
      },

      viewContractState: (contractId: string, input: any) => {
        throw new Error('Not implemented - should be set by HandlerApi implementor');
      },

      write: (contractId: string, input: any, throwOnError?: boolean) => {
        throw new Error('Not implemented - should be set by HandlerApi implementor');
      },

      refreshState: () => {
        throw new Error('Not implemented - should be set by HandlerApi implementor');
      }
    };
    this.vrf = new SWVrf(this);

    this.useGas = this.useGas.bind(this);
    this.getBalance = this.getBalance.bind(this);

    this.extensions = {};

    this.kv = new KV(storage, interactionState, this.transaction, this.contract.id);
  }

  useGas(gas: number) {
    if (gas < 0) {
      throw new Error(`[RE:GNE] Gas number exception - gas < 0.`);
    }
    this.gasUsed += gas;
    if (this.gasUsed > this.gasLimit) {
      throw new Error(`[RE:OOG] Out of gas! Used: ${this.gasUsed}, limit: ${this.gasLimit}`);
    }
  }

  async getBalance(address: string, height?: number): Promise<string> {
    if (!this._activeTx) {
      throw new Error('Cannot read balance - active tx is not set.');
    }
    if (!this.block.height) {
      throw new Error('Cannot read balance - block height not set.');
    }

    const effectiveHeight = height || this.block.height;

    // http://nyc-1.dev.arweave.net:1984/block/height/914387/wallet/M-mpNeJbg9h7mZ-uHaNsa5jwFFRAq0PsTkNWXJ-ojwI/balance
    return await fetch(
      `${this.evaluationOptions.walletBalanceUrl}block/height/${effectiveHeight}/wallet/${address}/balance`
    )
      .then((res) => {
        return res.ok ? res.text() : Promise.reject(res);
      })
      .catch((error) => {
        throw new Error(`Unable to read wallet balance. ${error.status}. ${error.body?.message}`);
      });
  }
}

// tslint:disable-next-line: max-classes-per-file
export class SWTransaction {
  constructor(private readonly smartWeaveGlobal: SmartWeaveGlobal) {}

  get id() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.id;
  }

  get owner() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.owner.address;
  }

  get target() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.recipient;
  }

  get tags(): GQLTagInterface[] {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.tags;
  }

  get sortKey(): string {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.sortKey;
  }

  get dryRun(): boolean {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.dry === true;
  }

  get quantity() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.quantity.winston;
  }

  get reward() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.fee.winston;
  }

  get origin(): TransactionOrigin {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.source === 'redstone-sequencer' ? 'L2' : 'L1';
  }
}

// tslint:disable-next-line: max-classes-per-file
export class SWBlock {
  constructor(private readonly smartWeaveGlobal: SmartWeaveGlobal) {}

  get height() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.block.height;
  }

  get indep_hash() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current Tx');
    }
    return this.smartWeaveGlobal._activeTx.block.id;
  }

  get timestamp() {
    if (!this.smartWeaveGlobal._activeTx) {
      throw new Error('No current tx');
    }
    return this.smartWeaveGlobal._activeTx.block.timestamp;
  }
}

export class SWVrf {
  constructor(private readonly smartWeaveGlobal: SmartWeaveGlobal) {}

  get data(): VrfData {
    return this.smartWeaveGlobal._activeTx.vrf;
  }

  // returns the original generated random number as a BigInt string;
  get value(): string {
    return this.smartWeaveGlobal._activeTx.vrf.bigint;
  }

  // returns a random value in a range from 1 to maxValue
  randomInt(maxValue: number): number {
    if (!Number.isInteger(maxValue)) {
      throw new Error('Integer max value required for random integer generation');
    }
    const result = (BigInt(this.smartWeaveGlobal._activeTx.vrf.bigint) % BigInt(maxValue)) + BigInt(1);

    if (result > Number.MAX_SAFE_INTEGER || result < Number.MIN_SAFE_INTEGER) {
      throw new Error('Random int cannot be cast to number');
    }

    return Number(result);
  }
}

export class KV {
  constructor(
    private readonly _storage: SortKeyCache<any> | null,
    private readonly _interactionState: InteractionState,
    private readonly _transaction: SWTransaction,
    private readonly _contractTxId: string
  ) {}

  async put(key: string, value: any): Promise<void> {
    this.checkStorageAvailable();
    await this._storage.put(new CacheKey(key, this._transaction.sortKey), value);
  }

  async get(key: string): Promise<unknown | null> {
    this.checkStorageAvailable();
    const sortKey = this._transaction.sortKey;

    // then we're checking if the values exists in the interactionState
    const interactionStateValue = await this._interactionState.getKV(
      this._contractTxId,
      new CacheKey(key, this._transaction.sortKey)
    );
    if (interactionStateValue != null) {
      return interactionStateValue;
    }

    const result = await this._storage.getLessOrEqual(key, this._transaction.sortKey);
    return result?.cachedValue || null;
  }

  async del(key: string): Promise<void> {
    this.checkStorageAvailable();
    const sortKey = this._transaction.sortKey;

    // then we're checking if the values exists in the interactionState
    const interactionStateValue = await this._interactionState.delKV(
      this._contractTxId,
      new CacheKey(key, this._transaction.sortKey)
    );
    if (interactionStateValue != null) {
      return interactionStateValue;
    }

    await this._storage.del(new CacheKey(key, this._transaction.sortKey));
  }

  async keys(options?: SortKeyCacheRangeOptions): Promise<string[]> {
    const sortKey = this._transaction.sortKey;
    return await this._storage.keys(sortKey, options);
  }

  async kvMap<V>(options?: SortKeyCacheRangeOptions): Promise<Map<string, V>> {
    const sortKey = this._transaction.sortKey;
    return this._storage.kvMap(sortKey, options);
  }

  async begin() {
    if (this._storage) {
      return this._storage.begin();
    }
  }

  async commit(): Promise<void> {
    if (this._storage) {
      if (this._transaction.dryRun) {
        await this._storage.rollback();
      } else {
        await this._storage.commit();
      }
    }
  }

  async rollback(): Promise<void> {
    if (this._storage) {
      await this._storage.rollback();
    }
  }

  open(): Promise<void> {
    if (this._storage) {
      return this._storage.open();
    }
  }

  close(): Promise<void> {
    if (this._storage) {
      return this._storage.close();
    }
  }

  private checkStorageAvailable() {
    if (!this._storage) {
      throw new Error('KV Storage not available');
    }
  }
}
