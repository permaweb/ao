import Router from '@koa/router';
import { contractsRoute } from './routes/contractsRoute';
import { interactionsRoute } from './routes/interactionsRoute';
import { searchRoute } from './routes/searchRoute';
import { totalTxsRoute } from './routes/stats/totalTxsRoute';
import { contractRoute } from './routes/contractRoute';
import { contractWithSourceRoute } from './routes/contractWithSourceRoute';
import { contractWithSourceRoute_v2 } from './routes/contractWithSourceRoute_v2';
import { interactionRoute } from './routes/interactionRoute';
import { safeContractsRoute } from './routes/safeContractsRoute';
import { sequencerRoute } from './routes/sequencerRoute';
import { interactionsStreamRoute } from './routes/interactionsStreamRoute';
import { deployContractRoute } from './routes/deployContractRoute';
import { arweaveBlockRoute, arweaveInfoRoute } from './routes/arweaveInfoRoute';
import { interactionsSortKeyRoute } from './routes/interactionsSortKeyRoute';
import { contractDataRoute } from './routes/contractDataRoute';
import { nftsOwnedByAddressRoute } from './routes/nftsOwnedByAddressRoute';
import { txsPerDayRoute } from './routes/stats/txsPerDayRoute';
import { interactionsContractGroupsRoute } from './routes/interactionsContractGroupsRoute';
import { interactionsSortKeyRoute_v2 } from './routes/interactionsSortKeyRoute_v2';
import { contractSourceRoute } from './routes/contractSourceRoute';
import { contractsBySourceRoute } from './routes/contractsBySourceRoute';
import { creatorRoute } from './routes/creatorRoute';
import { interactionsSonar } from './routes/interactionsSonar';
import { deployBundledRoute } from './routes/deployBundledRoute';
import { deploySourceRoute } from './routes/deploySourceRoute';
import { deploySourceRoute_v2 } from './routes/deploySourceRoute_v2';
import { deployContractRoute_v2 } from './routes/deployContractRoute_v2';
import { registerContractRoute } from './routes/registerContractRoute';
import { dashboardRoute } from './routes/dashboardRoute';

const gatewayRouter = (replica: boolean): Router => {
  const router = new Router({ prefix: '/gateway' });
  // get
  router.get('/contracts', contractsRoute);
  router.get('/contract', contractWithSourceRoute);
  router.get('/v2/contract', contractWithSourceRoute_v2);
  router.get('/contract-data/:id', contractDataRoute);
  router.get('/contracts/:id', contractRoute);
  router.get('/contracts-safe', safeContractsRoute);
  router.get('/dashboard', dashboardRoute);
  router.get('/search/:phrase', searchRoute);
  router.get('/nft/owner/:address', nftsOwnedByAddressRoute);
  // separate "transactionId" route to make caching in cloudfront possible
  router.get('/interactions/transactionId', interactionsRoute);
  router.get('/interactions', interactionsRoute);
  // adding temporarily - https://github.com/redstone-finance/redstone-sw-gateway/pull/65#discussion_r880555807
  router.get('/interactions-sonar', interactionsSonar);
  router.get('/interactions-sort-key', interactionsSortKeyRoute);
  router.get('/v2/interactions-sort-key', interactionsSortKeyRoute_v2);
  router.get('/interactions-stream', interactionsStreamRoute);
  router.get('/interactions-contract-groups', interactionsContractGroupsRoute);
  router.get('/interactions/:id', interactionRoute);
  router.get('/stats', totalTxsRoute);
  router.get('/stats/per-day', txsPerDayRoute);
  router.get('/arweave/info', arweaveInfoRoute);
  router.get('/arweave/block', arweaveBlockRoute);
  router.get('/contract-source', contractSourceRoute);
  router.get('/contracts-by-source', contractsBySourceRoute);
  router.get('/creator', creatorRoute);

  // post
  if (!replica) {
    router.post('/contracts/deploy', deployContractRoute);
    router.post('/contracts/deploy-bundled', deployBundledRoute);
    router.post('/sequencer/register', sequencerRoute);
    router.post('/sources/deploy', deploySourceRoute);
    router.post('/v2/sources/deploy', deploySourceRoute_v2);
    router.post('/v2/contracts/deploy', deployContractRoute_v2);
    router.post('/contracts/register', registerContractRoute);
  }

  return router;
};

export default gatewayRouter;
