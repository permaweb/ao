const { insertState, connect } = require('../db/nodeDb');
const { publish: appSyncPublish, initPubSub: initAppSyncPublish } = require('warp-contracts-pubsub');
const Redis = require('ioredis');
const { config } = require('../config');

initAppSyncPublish();

const redisPublisher = new Redis({
  ...config.gwPubSubConfig,
  lazyConnect: false
});

module.exports = {
  storeAndPublish: async (logger, isTest, contractTxId, result) => {
    insertState(connect(), contractTxId, result)
      .then((dbResult) => {
        logger.info('State stored in sqlite', contractTxId);

        if (!isTest) {
          try {
            redisPublisher.publish(
              'states',
              JSON.stringify({
                contractTxId: dbResult.contract_tx_id,
                sortKey: dbResult.sort_key,
                state: dbResult.state,
                node: dbResult.manifest.walletAddress,
                signature: dbResult.signature,
                manifest: dbResult.manifest,
                stateHash: dbResult.state_hash
              })
            );
            logger.debug('Published to Redis', contractTxId);
          } catch (e) {
            logger.error('Error while publishing to Redis');
          }

          if (config.appSync.publishState) {
            logger.info('Publishing to appSync');
            appSyncPublish(
              `states/${contractTxId}`,
              JSON.stringify({
                sortKey: result.sortKey,
                state: result.cachedValue.state,
                signature: dbResult.signature
              }),
              config.appSync.key
            )
              .then(() => {
                logger.debug(`Published to appSync ${contractTxId}`);
              })
              .catch((e) => {
                logger.error('Error while publishing to AppSync', e);
              });
          }
        }
      })
      .catch((e) => {
        logger.error('Error while storing in sqlite', e);
      });
  },
  checkStateSize: (state) => {
    const maxSize = config.workersConfig.maxStateSizeB;
    const stateSize = Buffer.byteLength(JSON.stringify(state));
    if (stateSize > maxSize) {
      throw new Error('[MaxStateSizeError] State too big');
    }
  }
};
