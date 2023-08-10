import { LevelDbCache } from '../../cache/impl/LevelDbCache';
import { defaultCacheOptions } from '../../core/WarpFactory';
import { CacheKey } from '../../cache/SortKeyCache';

const getContractId = (i: number) => `contract${i}`.padStart(43, '0');
const getSortKey = (j: number) =>
  `${j.toString().padStart(12, '0')},1643210931796,81e1bea09d3262ee36ce8cfdbbb2ce3feb18a717c3020c47d206cb8ecb43b767`;

describe('LevelDB cache prune', () => {
  const cache = async function (numContracts: number, numRepeatingEntries: number): Promise<LevelDbCache<any>> {
    const sut = new LevelDbCache<any>({ ...defaultCacheOptions, inMemory: true });

    for (let i = 0; i < numContracts; i++) {
      for (let j = 0; j < numRepeatingEntries; j++) {
        await sut.put(
          {
            key: getContractId(i),
            sortKey: getSortKey(j)
          },
          { result: `contract${i}:${j}` }
        );
      }
    }

    return sut;
  };

  it('handle improper args', async () => {
    const contracts = 10;
    const entriesPerContract = 1;
    const sut = await cache(contracts, entriesPerContract);

    await sut.prune(0);
    expect(await sut.getNumEntries()).toBe(contracts * entriesPerContract);
    await sut.prune(-1);
    expect(await sut.getNumEntries()).toBe(contracts * entriesPerContract);
  });

  it('no deletion should be performed', async () => {
    const contracts = 10;
    const entriesPerContract = 1;
    const numEntries = contracts * entriesPerContract;
    const sut = await cache(contracts, entriesPerContract);

    await sut.prune(1);
    expect(await sut.getNumEntries()).toBe(numEntries);
    await sut.prune(10);
    expect(await sut.getNumEntries()).toBe(numEntries);
    await sut.prune(contracts);
    expect(await sut.getNumEntries()).toBe(numEntries);
    await sut.prune(-1 * contracts);
    expect(await sut.getNumEntries()).toBe(numEntries);
    await sut.prune(contracts);
    expect(await sut.getNumEntries()).toBe(numEntries);
    await sut.prune(2 * contracts);
    expect(await sut.getNumEntries()).toBe(numEntries);
  });

  it('should remove all unneeded entries, one contract', async () => {
    const contracts = 1;
    const entriesPerContract = 10;
    const sut = await cache(contracts, entriesPerContract);
    await sut.prune(1);
    expect(await sut.getNumEntries()).toBe(contracts * 1);
  });

  it('should remove oldest entries, in many contracts', async () => {
    const contracts = 100;
    const entriesPerContract = 20;
    const toLeave = 3;
    const sut = await cache(contracts, entriesPerContract);
    await sut.prune(toLeave);

    for (let i = 0; i < contracts; i++) {
      // Check newest elements are present
      for (let j = 0; j < toLeave; j++) {
        expect(await sut.get(new CacheKey(getContractId(i), getSortKey(entriesPerContract - j - 1)))).toBeTruthy();
      }

      // Check old elements are removed
      for (let j = toLeave; j < entriesPerContract; j++) {
        expect(await sut.get(new CacheKey(getContractId(i), getSortKey(entriesPerContract - j - 1)))).toBeFalsy();
      }
    }

    expect(await sut.getNumEntries()).toBe(contracts * toLeave);
  });

  it('deletes contracts from cache', async () => {
    const contracts = 7;
    const entriesPerContract = 12;
    const sut = await cache(contracts, entriesPerContract);

    await sut.delete(getContractId(0));

    // Removed elements
    for (let j = 0; j < entriesPerContract; j++) {
      expect(await sut.get(new CacheKey(getContractId(0), getSortKey(j)))).toBeFalsy();
    }

    // Remaining elements
    for (let i = 1; i < contracts; i++) {
      for (let j = 0; j < entriesPerContract; j++) {
        expect(await sut.get(new CacheKey(getContractId(i), getSortKey(j)))).toBeTruthy();
      }
    }

    expect(await sut.getNumEntries()).toBe((contracts - 1) * entriesPerContract);
  });
});
