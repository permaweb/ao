import { randomBytes } from 'node:crypto'
import warpArBundles from 'warp-arbundles'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'
import { fromPromise } from 'hyper-async'
import workerpool from 'workerpool'

import cuClient from './clients/cu.js'
import schedulerClient from './clients/scheduler.js'
import signerClient from './clients/signer.js'
import uploaderClient from './clients/uploader.js'
import gatewayClient from './clients/gateway.js'
import * as InMemoryClient from './clients/in-memory.js'
import * as MetricsClient from './clients/metrics.js'
import * as SqliteClient from './clients/sqlite.js'
import cronClient from './clients/cron.js'

import { processMsgWith } from './api/processMsg.js'
import { processSpawnWith } from './api/processSpawn.js'
import { monitorProcessWith } from './api/monitorProcess.js'
import { stopMonitorProcessWith } from './api/stopMonitorProcess.js'
import { sendDataItemWith } from './api/sendDataItem.js'
import { sendAssignWith } from './api/sendAssign.js'
import { processAssignWith } from './api/processAssign.js'

import { createLogger } from './logger.js'
import { cuFetchWithCache } from './lib/cu-fetch-with-cache.js'
import { handleWorkerQueueMessage } from './lib/handle-worker-queue-message.js'
import { BroadcastChannel } from 'node:worker_threads'

export { errFrom } from './utils.js'

const { DataItem } = warpArBundles

const createDataItem = (raw) => new DataItem(raw)
export { createLogger }

const FIVE_MINUTES_IN_MS = 1000 * 60 * 5
const SIXTY_MINUTES_IN_MS = 1000 * 60 * 60
const muRedirectCache = InMemoryClient.createLruCache({ size: 500, ttl: FIVE_MINUTES_IN_MS })
const histogram = MetricsClient.histogramWith()({
  name: 'outgoing_http_request_duration_seconds',
  description: 'Outgoing request duration in seconds',
  buckets: [0.5, 1, 3, 5, 10, 30],
  labelNames: ['method', 'operation', 'errorType', 'status', 'statusGroup']
})
const workerQueueGauge = MetricsClient.gaugeWith({})({
  name: 'queue_size',
  description: 'The size of the queue'
})
const cronMonitorGauge = MetricsClient.gaugeWith({})({
  name: 'running_cron_monitor',
  description: 'The number of cron monitors running'
})

/**
 * A set of apis used by the express server
 * to send initial items and start the message
 * pushing process etc...
 */
export const createApis = async (ctx) => {
  const CU_URL = ctx.CU_URL
  const UPLOADER_URL = ctx.UPLOADER_URL
  const PROC_FILE_PATH = ctx.PROC_FILE_PATH
  const CRON_CURSOR_DIR = ctx.CRON_CURSOR_DIR

  const logger = ctx.logger
  const fetch = ctx.fetch

  const fetchWithCache = cuFetchWithCache({
    fetch,
    cache: muRedirectCache,
    logger
  })

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL: ctx.GRAPHQL_URL, followRedirects: true })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  /**
   * TODO: I don't really like implictly doing this,
   * but works for now.
   */
  const _metrics = MetricsClient.initializeRuntimeMetricsWith({})()

  const metrics = {
    contentType: _metrics.contentType,
    compute: fromPromise(() => _metrics.metrics())
  }

  // Create database client
  const DB_URL = `${ctx.DB_URL}.sqlite`
  const db = await SqliteClient.createSqliteClient({ url: DB_URL, bootstrap: true })

  /**
   * Select queue ids from database on startup.
   * This will allow us to "pick up" persisted tasks
   * from the last lifecycle. Create an array of
   * queue Ids that we will initialize worker threads with.
   */
  const createGetQueuesQuery = () => ({
    sql: `
      SELECT queueId FROM ${SqliteClient.TASKS_TABLE} 
      GROUP BY queueID
      `,
    parameters: []
  })
  const queueIds = (await db.query(createGetQueuesQuery())).map((queue) => queue.queueId)

  const workerPool = workerpool.pool('./src/domain/clients/worker.js', {
    minWorkers: queueIds.length, // We must have as many workers as there are queues to persist
    maxWorkers: ctx.MAX_WORKERS,
    onCreateWorker: () => {
      let queueId = randomBytes(8).toString('hex')

      // If we have queue ids in the database, initialize worker with that id
      if (queueIds.length > 0) {
        queueId = queueIds.shift()
      }
      const workerId = randomBytes(8).toString('hex')
      ctx.logger('Starting worker with id "%s", queue id "%s"...', workerId, queueId)
      return {
        workerThreadOpts: {
          workerData: {
            id: workerId,
            queueId,
            DB_URL,
            TASK_QUEUE_MAX_RETRIES: ctx.TASK_QUEUE_MAX_RETRIES,
            TASK_QUEUE_RETRY_DELAY: ctx.TASK_QUEUE_RETRY_DELAY
          }
        }
      }
    }
  })

  const broadcastChannel = new BroadcastChannel('mu-worker')
  broadcastChannel.onmessage = (event) => handleWorkerQueueMessage({ queueGauge: workerQueueGauge })({ payload: event.data })

  const enqueueResults = async (...results) => {
    return workerPool.exec('enqueueResults', results)
  }

  const crank = fromPromise(enqueueResults)

  const sendDataItemLogger = logger.child('sendDataItem')
  const sendDataItem = sendDataItemWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendDataItemLogger }),
    createDataItem,
    locateScheduler: raw,
    locateProcess: locate,
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, histogram, logger: sendDataItemLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: sendDataItemLogger }),
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, histogram, logger: sendDataItemLogger }),
    crank,
    isWallet: gatewayClient.isWalletWith({ fetch, histogram, GRAPHQL_URL: ctx.GRAPHQL_URL, logger: sendDataItemLogger }),
    logger: sendDataItemLogger,
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: sendDataItemLogger, fetch, histogram })
  })

  const sendAssignLogger = logger.child('sendAssign')
  const sendAssign = sendAssignWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendDataItemLogger }),
    locateProcess: locate,
    writeAssignment: schedulerClient.writeAssignmentWith({ fetch, histogram, logger: sendAssignLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: sendDataItemLogger }),
    crank,
    logger: sendAssignLogger
  })

  const monitorProcessLogger = logger.child('monitorProcess')
  const fetchCron = fromPromise(cuClient.fetchCronWith({ fetch, histogram, CU_URL, logger: monitorProcessLogger }))
  const startProcessMonitor = cronClient.startMonitoredProcessWith({
    fetch,
    histogram,
    logger: monitorProcessLogger,
    PROC_FILE_PATH,
    CRON_CURSOR_DIR,
    CU_URL,
    fetchCron,
    crank,
    monitorGauge: cronMonitorGauge
  })

  const monitorProcess = monitorProcessWith({
    startProcessMonitor,
    createDataItem,
    logger: monitorProcessLogger
  })

  const stopMonitorProcessLogger = logger.child('stopMonitorProcess')
  const stopMonitorProcess = stopMonitorProcessWith({
    stopProcessMonitor: cronClient.killMonitoredProcessWith({
      logger: stopMonitorProcessLogger,
      PROC_FILE_PATH,
      monitorGauge: cronMonitorGauge
    }),
    createDataItem,
    logger: monitorProcessLogger
  })

  return {
    metrics,
    sendDataItem,
    monitorProcess,
    stopMonitorProcess,
    sendAssign,
    fetchCron,
    initCronProcs: cronClient.initCronProcsWith({
      PROC_FILE_PATH,
      startMonitoredProcess: startProcessMonitor
    })
  }
}

/**
 * A seperate set of apis used by the worker
 * to process results. These are seperate because
 * we dont want the worker to initialize the same
 * apis that create another worker pool.
 */
export const createResultApis = async (ctx) => {
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET
  const UPLOADER_URL = ctx.UPLOADER_URL

  const logger = ctx.logger
  const fetch = ctx.fetch

  const fetchWithCache = cuFetchWithCache({
    fetch,
    cache: muRedirectCache,
    logger
  })

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL: ctx.GRAPHQL_URL, followRedirects: true })
  const { locate: locateNoRedirect } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL: ctx.GRAPHQL_URL, followRedirects: false })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  const isWalletCache = InMemoryClient.createLruCache({ size: 1000, ttl: SIXTY_MINUTES_IN_MS })
  const getById = InMemoryClient.getByIdWith({ cache: isWalletCache })
  const setById = InMemoryClient.setByIdWith({ cache: isWalletCache })

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
    createDataItem,
    locateScheduler: raw,
    locateProcess: locate,
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, histogram, logger: processMsgLogger }),
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, histogram, logger: processMsgLogger }),
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: processMsgLogger }),
    logger,
    isWallet: gatewayClient.isWalletWith({ fetch, histogram, GRAPHQL_URL: ctx.GRAPHQL_URL, logger: processMsgLogger, setById, getById }),
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: processMsgLogger, fetch, histogram })
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    locateScheduler: raw,
    locateProcess: locate,
    locateNoRedirect,
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, histogram, logger: processSpawnLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: processMsgLogger })
  })

  const processAssignLogger = logger.child('processAssign')
  const processAssign = processAssignWith({
    logger: processSpawnLogger,
    locateProcess: locate,
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: processAssignLogger }),
    writeAssignment: schedulerClient.writeAssignmentWith({ fetch, histogram, logger: processAssignLogger })
  })
  return {
    processMsg,
    processAssign,
    processSpawn
  }
}
