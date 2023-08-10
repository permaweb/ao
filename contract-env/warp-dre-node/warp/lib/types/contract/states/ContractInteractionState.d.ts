import { InteractionState } from './InteractionState';
import { CacheKey } from '../../cache/SortKeyCache';
import { EvalStateResult } from '../../core/modules/StateEvaluator';
import { GQLNodeInterface } from '../../legacy/gqlResult';
import { Warp } from '../../core/Warp';
import { SortKeyCacheRangeOptions } from '../../cache/SortKeyCacheRangeOptions';
export declare class ContractInteractionState implements InteractionState {
    private readonly _warp;
    private readonly _json;
    private readonly _initialJson;
    private readonly _kv;
    constructor(_warp: Warp);
    has(contractTx: any): boolean;
    get(contractTxId: string): EvalStateResult<unknown>;
    getKV(contractTxId: string, cacheKey: CacheKey): Promise<unknown>;
    delKV(contractTxId: string, cacheKey: CacheKey): Promise<void>;
    getKvKeys(contractTxId: string, sortKey?: string, options?: SortKeyCacheRangeOptions): Promise<string[]>;
    getKvRange(contractTxId: string, sortKey?: string, options?: SortKeyCacheRangeOptions): Promise<Map<string, unknown>>;
    commit(interaction: GQLNodeInterface): Promise<void>;
    commitKV(): Promise<void>;
    rollback(interaction: GQLNodeInterface): Promise<void>;
    setInitial(contractTxId: string, state: EvalStateResult<unknown>): void;
    update(contractTxId: string, state: EvalStateResult<unknown>): void;
    updateKV(contractTxId: string, key: CacheKey, value: unknown): Promise<void>;
    private getOrInitKvStorage;
    private reset;
    private doStoreJson;
    private rollbackKVs;
    private commitKVs;
}
//# sourceMappingURL=ContractInteractionState.d.ts.map