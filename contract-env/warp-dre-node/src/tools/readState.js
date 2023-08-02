const { defaultCacheOptions, WarpFactory } = require('warp-contracts');
const { LmdbCache } = require('warp-contracts-lmdb');

async function readState() {
  const warp = WarpFactory.forMainnet()
    .useStateCache(
      new LmdbCache({
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/state`
      })
    )
    .useContractCache(
      new LmdbCache({
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/contract`
      }),
      new LmdbCache({
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/source`
      })
    );

  const result = await warp.contract("pChLLDZ3tuj4g4mqSS-QbXjqVRciV2wQdbnKQlK_t_A")
    .getStorageValue("33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA");

  /*const result = await warp
    .contract('pbabEjmdaqOvF-yTkFhs5i2lbmmbC6s4NrUqM_8eAYE')
    .setEvaluationOptions({
      allowBigInt: true
    })
    .readState();*/

  console.log(result);

  //console.log(Object.keys(result.cachedValue.validity).length);
  //console.log(result.cachedValue.validity['TfUtCyTPAnnoX3a69IP_Eo9td9unTu2G_0V_VnVKNR8']);
}

readState().finally();
