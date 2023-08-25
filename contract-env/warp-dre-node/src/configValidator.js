module.exports = (config) => {
  if (config.appSync.publishState && !config.appSync.key) {
    throw new Error('You have to set up appSync.key if you have appSync.publishState as true.');
  }

  if (!config.nodeJwk) {
    throw new Error('NODE_JWK_KEY is required parameter');
  }
  if (!config.pubsub) {
    throw new Error('nodeJwk is required parameter');
  }
};
