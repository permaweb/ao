/* eslint-disable */
import {defaultCacheOptions, WarpFactory} from '../src';

async function main() {
  const warp = WarpFactory.forMainnet();

  const contract = await warp
    .contract('pbabEjmdaqOvF-yTkFhs5i2lbmmbC6s4NrUqM_8eAYE')
    .syncState('https://dre-1.warp.cc/contract', {validity: true});

  await warp.stateEvaluator.getCache().put()

  const {sortKey} = await warp.stateEvaluator.latestAvailableState('pbabEjmdaqOvF-yTkFhs5i2lbmmbC6s4NrUqM_8eAYE');

  console.log(sortKey);
}

main().catch((e) => console.error(e));
