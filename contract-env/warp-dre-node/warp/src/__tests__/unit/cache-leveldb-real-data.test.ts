import { LevelDbCache } from '../../cache/impl/LevelDbCache';
import { defaultCacheOptions, WarpFactory } from '../../core/WarpFactory';

jest.setTimeout(90000);
describe.skip('Prune real Lmdb cache. Copy the real cache to ./dst, unskip and run yarn test:cache:real', () => {
  test('handle real data', async () => {
    const sut = new LevelDbCache<any>({ ...defaultCacheOptions, dbLocation: './dst' });
    const entriesBefore = await sut.getNumEntries();
    await sut.prune(1);
    const entriesAfter = await sut.getNumEntries();
    console.log('Before:', entriesBefore, 'After:', entriesAfter, 'Removed:', entriesBefore - entriesAfter);
  });
});
