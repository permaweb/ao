const { defaultCacheOptions, WarpFactory } = require('warp-contracts');
const { LmdbCache } = require('warp-contracts-lmdb');
const { NlpExtension } = require('warp-contracts-plugin-nlp');
const { EvaluationProgressPlugin } = require('warp-contracts-evaluation-progress-plugin');
const { EventEmitter } = require('node:events');
const { events, connect, getFailures } = require('./db/nodeDb');
const { EthersExtension } = require('warp-contracts-plugin-ethers');
const { EvmSignatureVerificationServerPlugin } = require('warp-contracts-plugin-signature/server');
const { ContractBlacklistPlugin, getDreBlacklistFunction } = require('warp-contracts-plugin-blacklist');
const { config } = require('./config');
const { VM2Plugin } = require('warp-contracts-plugin-vm2');
const { VRFPlugin } = require('warp-contracts-plugin-vrf');
const { JWTVerifyPlugin } = require('@othent/warp-contracts-plugin-jwt-verify');

const eventEmitter = new EventEmitter();
eventEmitter.on('progress-notification', (data) => {
  events.progress(data.contractTxId, data.message);
});

const warp = WarpFactory.forMainnet()
  .useStateCache(
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/state`
      },
      {
        minEntriesPerContract: 5,
        maxEntriesPerContract: 20
      }
    )
  )
  .useContractCache(
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/contract`
      },
      {
        minEntriesPerContract: 1,
        maxEntriesPerContract: 5
      }
    ),
    new LmdbCache(
      {
        ...defaultCacheOptions,
        dbLocation: `./cache/warp/lmdb/source`
      },
      {
        minEntriesPerContract: 1,
        maxEntriesPerContract: 5
      }
    )
  )
  .useKVStorageFactory(
    (contractTxId) =>
      new LmdbCache(
        {
          ...defaultCacheOptions,
          dbLocation: `./cache/warp/kv/lmdb/${contractTxId}`
        },
        {
          minEntriesPerContract: 3,
          maxEntriesPerContract: 10
        }
      )
  )
  .use(new EvaluationProgressPlugin(eventEmitter, 500))
  .use(new NlpExtension())
  .use(new EvmSignatureVerificationServerPlugin())
  .use(new EthersExtension())
  .use(new VM2Plugin())
  .use(new VRFPlugin())
  .use(new JWTVerifyPlugin())
  .use(
    new ContractBlacklistPlugin(async (input) => {
      const blacklistFunction = await getDreBlacklistFunction(getFailures, connect(), config.workersConfig.maxFailures);
      return await blacklistFunction(input);
    })
  );
warp.whoAmI = config.dreName || 'DRE';

module.exports = warp;
