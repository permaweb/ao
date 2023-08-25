const warp = require('../warp');
const { LoggerFactory, genesisSortKey, CacheKey, EvalStateResult } = require('warp-contracts');
const { storeAndPublish, checkStateSize } = require('./common');
const { config } = require('../config');

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('info', 'contractsProcessor');
const logger = LoggerFactory.INST.create('contractsProcessor');
LoggerFactory.INST.logLevel('debug', 'EvaluationProgressPlugin');

module.exports = async (job) => {
  // workaround for https://github.com/taskforcesh/bullmq/issues/1557
  try {
    const contractTxId = job.data.contractTxId;
    logger.info('Register Processor', contractTxId);
    const isTest = job.data.test;

    const stateCache = warp.stateEvaluator.getCache();

    let result;
    if (job.data.force) {
      result = await warp.contract(contractTxId).setEvaluationOptions(config.evaluationOptions).readState();
      checkStateSize(result.cachedValue.state);
    } else {
      checkStateSize(job.data.initialState);
      await stateCache.put(
        new CacheKey(contractTxId, genesisSortKey),
        new EvalStateResult(job.data.initialState, {}, {})
      );
      result = {
        sortKey: genesisSortKey,
        cachedValue: {
          state: job.data.initialState,
          validity: {},
          errorMessages: {}
        }
      };
    }
    storeAndPublish(logger, isTest, contractTxId, result).finally(() => {});
  } catch (e) {
    logger.error('Exception in update processor', e);
    throw new Error(e);
  }
};
