const { Queue, Worker, MetricsTime, QueueEvents } = require('bullmq');
const path = require('path');
const Redis = require('ioredis');
const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const compress = require('koa-compress');
const zlib = require('zlib');
const router = require('./router');
const { StreamrWsClient } = require('warp-contracts-pubsub');
const { config, logConfig } = require('./config');
const {
  createNodeDbTables,
  insertFailure,
  upsertBlacklist,
  getFailures,
  connect,
  events,
  hasContract,
  connectEvents,
  createNodeDbEventsTables,
  doBlacklist
} = require('./db/nodeDb');

const logger = require('./logger')('listener');
const exitHook = require('async-exit-hook');
const warp = require('./warp');

let isTestInstance = config.env === 'test';
let port = 8080;

let timestamp = Date.now();

const updateQueueName = 'update';
const registerQueueName = 'register';

let updateWorker;
let registerWorker;

const nonBlacklistErrors = [
  'Unable to retrieve transactions. Warp gateway responded with status',
  'Trying to use testnet contract in a non-testnet env. Use the "forTestnet" factory method.'
];

async function runListener() {
  logger.info('🚀🚀🚀 Starting execution node');
  await logConfig();

  const nodeDb = connect();
  const nodeDbEvents = connectEvents();

  await createNodeDbTables(nodeDb);
  await createNodeDbEventsTables(nodeDbEvents);

  /* eslint no-unused-vars: "off", curly: "error" */
  let timestamp = Date.now();
  setInterval(() => {
    timestamp = Date.now();
  }, config.workersConfig.jobIdRefreshSeconds * 1000);

  const updateQueue = new Queue(updateQueueName, {
    connection: config.bullMqConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: config.workersConfig.jobIdRefreshSeconds
      },
      removeOnFail: true
    }
  });
  const registerQueue = new Queue(registerQueueName, {
    connection: config.bullMqConnection,
    defaultJobOptions: {
      removeOnComplete: {
        age: 3600
      },
      removeOnFail: true
    }
  });

  const updateEvents = new QueueEvents(updateQueueName, { connection: config.bullMqConnection });
  const registerEvents = new QueueEvents(registerQueueName, { connection: config.bullMqConnection });

  async function onFailedJob(contractTxId, jobId, failedReason) {
    await insertFailure(nodeDb, {
      contract_tx_id: contractTxId,
      evaluation_options: config.evaluationOptions,
      sdk_config: config.warpSdkConfig,
      job_id: jobId,
      failure: failedReason
    });
    if (failedReason.includes('[MaxStateSizeError]')) {
      await doBlacklist(nodeDb, contractTxId, config.workersConfig.maxFailures);
    } else {
      if (!nonBlacklistErrors.includes(failedReason)) {
        await upsertBlacklist(nodeDb, contractTxId);
      }
    }
    events.failure(nodeDbEvents, contractTxId, failedReason);
  }

  updateEvents.on('failed', async ({ jobId, failedReason }) => {
    logger.error('Update job failed', { jobId, failedReason });
    const contractTxId = jobId.split('|')[0];
    await onFailedJob(contractTxId, jobId, failedReason);
  });
  updateEvents.on('added', async ({ jobId }) => {
    logger.info('Job added to update queue', jobId);
    const contractTxId = jobId.split('|')[0];
    events.update(nodeDbEvents, contractTxId);
  });
  updateEvents.on('completed', async ({ jobId, returnvalue }) => {
    logger.info('Update job completed', { jobId, returnvalue });
    const contractTxId = jobId.split('|')[0];
    if (returnvalue?.lastSortKey) {
      events.updated(nodeDbEvents, contractTxId, returnvalue.lastSortKey);
    } else {
      events.evaluated(nodeDbEvents, contractTxId);
    }
  });

  registerEvents.on('failed', async ({ jobId, failedReason }) => {
    logger.error('Register job failed', { jobId, failedReason });
    const contractTxId = jobId;

    await onFailedJob(contractTxId, jobId, failedReason);
  });
  registerEvents.on('added', async ({ jobId }) => {
    logger.info('Job added to register queue', jobId);
    events.register(nodeDbEvents, jobId);
  });
  registerEvents.on('completed', async ({ jobId }) => {
    logger.info('Register job completed', jobId);
    events.evaluated(nodeDbEvents, jobId);
  });

  await clearQueue(updateQueue);
  await clearQueue(registerQueue);

  const updateProcessor = path.join(__dirname, 'workers', 'updateProcessor');
  updateWorker = new Worker(updateQueueName, updateProcessor, {
    concurrency: config.workersConfig.update,
    connection: config.bullMqConnection,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK
    }
  });

  const registerProcessor = path.join(__dirname, 'workers', 'registerProcessor');
  registerWorker = new Worker(registerQueueName, registerProcessor, {
    concurrency: config.workersConfig.register,
    connection: config.bullMqConnection,
    metrics: {
      maxDataPoints: MetricsTime.ONE_WEEK
    }
  });

  const app = new Koa();
  app
    .use(corsConfig())
    .use(compress(compressionSettings))
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
    .use(async (ctx, next) => {
      await next();
      ctx.redirect('/status');
    });
  app.context.updateQueue = updateQueue;
  app.context.registerQueue = registerQueue;
  app.context.nodeDb = nodeDb;
  app.context.nodeDbEvents = nodeDbEvents;
  app.listen(port);

  await subscribeToGatewayNotifications(nodeDb, nodeDbEvents, updateQueue, registerQueue);

  logger.info(`Listening on port ${port}`);
}

runListener().catch((e) => {
  logger.error(e);
});

async function processContractData(msgObj, nodeDb, nodeDbEvents, registerQueue, updatedQueue) {
  logger.info(`Received '${msgObj.contractTxId}'`);

  let validationMessage = null;
  if (!isTxIdValid(msgObj.contractTxId)) {
    validationMessage = 'Invalid tx id format';
  }

  if ((!msgObj.initialState && !msgObj.interaction) || (msgObj.initialState && msgObj.interaction)) {
    validationMessage = 'Invalid message format';
  }

  if (msgObj.test && !isTestInstance) {
    validationMessage = 'Skipping test instance message';
  }

  if (!msgObj.test && isTestInstance) {
    validationMessage = 'Skipping non-test instance message';
  }

  if (validationMessage == null) {
    const contractFailures = await getFailures(nodeDb, msgObj.contractTxId);
    if (Number.isInteger(contractFailures) && contractFailures > config.workersConfig.maxFailures - 1) {
      validationMessage = `Contract blacklisted: ${msgObj.contractTxId}`;
    }
  }

  if (validationMessage !== null) {
    logger.warn('Message rejected:', validationMessage);
    events.reject(nodeDbEvents, msgObj.contractTxId, validationMessage);
    return;
  }

  const contractTxId = msgObj.contractTxId;
  const isRegistered = await hasContract(nodeDb, contractTxId);

  const baseMessage = {
    contractTxId,
    appSyncKey: config.appSync.key,
    test: isTestInstance
  };
  if (msgObj.initialState) {
    if (isRegistered) {
      validationMessage = 'Contract already registered';
      logger.warn(validationMessage);
      events.reject(nodeDbEvents, msgObj.contractTxId, validationMessage);
      return;
    }
    const jobId = msgObj.contractTxId;
    await registerQueue.add(
      'initContract',
      {
        ...baseMessage,
        initialState: msgObj.initialState
      },
      { jobId }
    );
    logger.info('Published to contracts queue', jobId);
  } else if (msgObj.interaction) {
    if (await isRegisteringContract(registerQueue, contractTxId)) {
      logger.warn(`${contractTxId} is currently being registered, skipping update`);
      return;
    }
    if (!isRegistered) {
      logger.warn('Contract not registered, adding to register queue', contractTxId);
      await registerQueue.add(
        'initContract',
        {
          ...baseMessage,
          force: true
        },
        { jobId: contractTxId }
      );
    } else {
      const jobId = `${msgObj.contractTxId}|${timestamp}`;
      await updatedQueue.add(
        'evaluateInteraction',
        {
          ...baseMessage,
          interaction: msgObj.interaction
        },
        { jobId }
      );
    }
  }

  async function isRegisteringContract(registerQueue, contractTxId) {
    const jobState = await registerQueue.getJobState(contractTxId);
    // https://api.docs.bullmq.io/classes/Queue.html#getJobState
    const inProgressStates = ['delayed', 'active', 'waiting', 'waiting-children'];
    return inProgressStates.includes(jobState);
  }
}

async function subscribeToGatewayNotifications(nodeDb, nodeDbEvents, updatedQueue, registerQueue) {
  const onMessage = async (data) => await processContractData(data, nodeDb, nodeDbEvents, registerQueue, updatedQueue);
  const onError = (err) => logger.error('Failed to subscribe:', err);

  let pubsubType = config.pubsub.type;
  logger.info(`Starting pubsub in ${pubsubType} mode`);
  switch (pubsubType) {
    case 'streamr': {
      const connection = {
        direction: 'sub',
        streamId: config.streamr.id
      };
      if (config.streamr.host) {
        connection.readHost = config.streamr.host;
      }
      if (config.streamr.port) {
        connection.readPort = config.streamr.port;
      }
      const pubsub = await StreamrWsClient.create(connection);
      pubsub.sub(onMessage, onError);
      process.on('exit', () => {
        logger.info('Closing pubsub');
        pubsub.close();
      });
      break;
    }
    case 'redis': {
      const subscriber = new Redis(config.gwPubSubConfig);
      await subscriber.connect();
      logger.info('Connected to Warp Gateway notifications', subscriber.status);

      subscriber.subscribe('contracts', (err, count) => {
        if (err) {
          onError(err.message);
        } else {
          logger.info(`Subscribed successfully! This client is currently subscribed to ${count} channels.`);
        }
      });
      subscriber.on('message', async (channel, message) => {
        const msgObj = JSON.parse(message);
        logger.info(`From channel '${channel}'`);
        onMessage(msgObj);
      });
      process.on('exit', () => subscriber.disconnect());
      break;
    }
    default:
      throw new Error(`Pubsub type ${pubsubType} not supported`);
  }
}

const compressionSettings = {
  threshold: 2048,
  deflate: false,
  br: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4
    }
  }
};

function corsConfig() {
  return cors({
    async origin() {
      return '*';
    }
  });
}

async function clearQueue(queue) {
  // await deleteOldActiveJobs(queue);
  await queue.obliterate({ force: true });
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

setInterval(() => {
  timestamp = Date.now();
}, config.workersConfig.jobIdRefreshSeconds * 1000);

// Graceful shutdown
async function cleanup(callback) {
  logger.info('Interrupted');
  await updateWorker?.close();
  await registerWorker?.close();
  await warp.close();
  logger.info('Clean up finished');
  callback();
}

exitHook(cleanup);
