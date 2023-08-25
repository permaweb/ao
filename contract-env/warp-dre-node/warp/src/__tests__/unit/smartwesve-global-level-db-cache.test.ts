import { DEFAULT_LEVEL_DB_LOCATION, WarpFactory } from '../../core/WarpFactory';
import fs from 'fs';
import { SmartWeaveGlobal } from '../../legacy/smartweave-global';
import Arweave from 'arweave';
import { DefaultEvaluationOptions } from '../../core/modules/StateEvaluator';
import { LevelDbCache } from '../../cache/impl/LevelDbCache';
import { GQLNodeInterface } from '../../legacy/gqlResult';
import { CacheKey } from '../../cache/SortKeyCache';
import { ContractInteractionState } from '../../contract/states/ContractInteractionState';

describe('KV database', () => {
  describe('with the SmartWeave Global KV implementation', () => {
    const arweave = Arweave.init({});
    const db = new LevelDbCache({
      inMemory: false,
      dbLocation: `${DEFAULT_LEVEL_DB_LOCATION}/kv/ldb/KV_TRIE_TEST_SW_GLOBAL`
    });

    const interactionState = new ContractInteractionState(WarpFactory.forTestnet());

    const sut = new SmartWeaveGlobal(
      arweave,
      { id: 'KV_TRIE_TEST_SW_GLOBAL', owner: '' },
      new DefaultEvaluationOptions(),
      interactionState,
      db
    );

    it('should set values', async () => {
      sut._activeTx = { sortKey: '123' } as GQLNodeInterface;
      await sut.kv.put('foo', 'bar');
      await sut.kv.put('one', [1]);
      await sut.kv.put('one', { val: 1 });
      await sut.kv.put('two', { val: 2 });

      expect(await sut.kv.get('one')).toEqual({ val: 1 });
      expect(await sut.kv.get('ninety')).toBeNull();

      await sut.kv.commit();
      await db.close();
      await interactionState.commit(sut._activeTx);
      await db.open();
      expect(await sut.kv.get('one')).toEqual({ val: 1 });

      sut._activeTx = { sortKey: '222' } as GQLNodeInterface;
      await sut.kv.put('one', '1');
      await sut.kv.put('three', 3);
      await sut.kv.commit();
      await db.close();
      await interactionState.commit(sut._activeTx);
      await db.open();

      sut._activeTx = { sortKey: '330' } as GQLNodeInterface;
      await sut.kv.put('one', { val: [1] });
      await sut.kv.put('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA', 23111222);
      await sut.kv.commit();
      await db.close();
      await interactionState.commit(sut._activeTx);
      await db.open();

      expect(await sut.kv.get('foo')).toEqual('bar');
      expect(await sut.kv.get('one')).toEqual({ val: [1] });
      expect(await sut.kv.get('three')).toEqual(3);
      expect(await sut.kv.get('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA')).toEqual(23111222);

      expect((await db.get(new CacheKey('foo', '123'))).cachedValue).toEqual('bar');
      expect((await db.get(new CacheKey('one', '123'))).cachedValue).toEqual({ val: 1 });
      expect((await db.get(new CacheKey('one', '222'))).cachedValue).toEqual('1');
      expect((await db.get(new CacheKey('one', '330'))).cachedValue).toEqual({ val: [1] });
    });
  });
});
