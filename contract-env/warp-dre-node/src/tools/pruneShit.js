const { LmdbCache } = require('warp-contracts-lmdb');

const { defaultCacheOptions } = require('warp-contracts');

const lmdb = new LmdbCache({
  ...defaultCacheOptions,
  dbLocation: `./cache/warp/lmdb/state`
});

(async () => {
  const stats = await lmdb.prune(2);
  console.log(stats);
})();
