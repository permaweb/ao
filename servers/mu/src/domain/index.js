import { randomBytes } from 'node:crypto'
import { BroadcastChannel } from 'node:worker_threads'
import cron from 'node-cron'

import { apply } from 'ramda'
import warpArBundles from 'warp-arbundles'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'
import { fromPromise } from 'hyper-async'
import workerpool from 'workerpool'
import Arweave from 'arweave'

import cuClient from './clients/cu.js'
import schedulerClient from './clients/scheduler.js'
import signerClient from './clients/signer.js'
import uploaderClient from './clients/uploader.js'
import gatewayClient from './clients/gateway.js'
import * as InMemoryClient from './clients/in-memory.js'
import * as MetricsClient from './clients/metrics.js'
import * as SqliteClient from './clients/sqlite.js'
import cronClient, { deleteCronProcessWith, getCronProcessCursorWith, saveCronProcessWith, updateCronProcessCursorWith } from './clients/cron.js'
import { readTracesWith } from './clients/tracer.js'
import * as RelayClient from './clients/relay.js'

import { processMsgWith } from './api/processMsg.js'
import { processSpawnWith } from './api/processSpawn.js'
import { monitorProcessWith } from './api/monitorProcess.js'
import { stopMonitorProcessWith } from './api/stopMonitorProcess.js'
import { sendDataItemWith, startMessageRecoveryCronWith } from './api/sendDataItem.js'
import { sendAssignWith } from './api/sendAssign.js'
import { processAssignWith } from './api/processAssign.js'
import { pushMsgWith } from './api/pushMsg.js'

import { createLogger } from './logger.js'
import { cuFetchWithCache } from './lib/cu-fetch-with-cache.js'
import { handleWorkerMetricsMessage } from './lib/handle-worker-metrics-message.js'
import { fetchCronSchema } from './dal.js'

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
const maximumQueueArray = new Array(60).fill(0)
const maximumQueueTimeArray = new Array(60).fill(undefined)

MetricsClient.gaugeWith({})({
  name: 'queue_size',
  description: 'The size of the queue',
  collect: () => apply(Math.max, maximumQueueArray)
})
const cronMonitorGauge = MetricsClient.gaugeWith({})({
  name: 'running_cron_monitor',
  description: 'The number of cron monitors running'
})
const taskRetriesGauge = MetricsClient.gaugeWith({})({
  name: 'task_retries',
  description: 'The number of retries a task requires',
  labelNames: ['retries', 'status']
})

const errorStageGauge = MetricsClient.gaugeWith({})({
  name: 'error_stage',
  description: 'The number of errors at a given stage',
  labelNames: ['stage', 'type']
})

const arweave = Arweave.init()

/**
 * A set of apis used by the express server
 * to send initial items and start the message
 * pushing process etc...
 */
export const createApis = async (ctx) => {
  const CU_URL = ctx.CU_URL
  const UPLOADER_URL = ctx.UPLOADER_URL
  const GRAPHQL_URL = ctx.GRAPHQL_URL
  const ARWEAVE_URL = ctx.ARWEAVE_URL
  const PROC_FILE_PATH = ctx.PROC_FILE_PATH
  const CRON_CURSOR_DIR = ctx.CRON_CURSOR_DIR
  const SPAWN_PUSH_ENABLED = ctx.SPAWN_PUSH_ENABLED
  const ALLOW_PUSHES_AFTER = ctx.ALLOW_PUSHES_AFTER

  const logger = ctx.logger
  const fetch = ctx.fetch

  const fetchWithCache = cuFetchWithCache({
    fetch,
    cache: muRedirectCache,
    logger
  })

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL, followRedirects: true })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  /**
   * TODO: I don't really like implicitly doing this,
   * but works for now.
   */
  const _metrics = MetricsClient.initializeRuntimeMetricsWith({})()

  const metrics = {
    contentType: _metrics.contentType,
    compute: fromPromise(() => _metrics.metrics())
  }

  // Create database client
  const DB_URL = `${ctx.DB_URL}.sqlite`
  const db = await SqliteClient.createSqliteClient({ url: DB_URL, bootstrap: true, type: 'tasks' })

  // Create log database client
  const TRACE_DB_URL = `${ctx.TRACE_DB_URL}.sqlite`
  const traceDb = await SqliteClient.createSqliteClient({ url: TRACE_DB_URL, bootstrap: true, type: 'traces' })

  // Create trace database metrics
  MetricsClient.gaugeWith({})({
    name: 'db_size',
    description: 'The size of the databases',
    labelNames: ['database'],
    labeledCollect: async () => {
      const taskPageSize = await db.pragma('page_size', { simple: true })
      const taskPageCount = await db.pragma('page_count', { simple: true })

      const tracePageSize = await traceDb.pragma('page_size', { simple: true })
      const tracePageCount = await traceDb.pragma('page_count', { simple: true })

      const labelValues = [
        { labelName: 'database', labelValue: 'task', value: taskPageSize * taskPageCount },
        { labelName: 'database', labelValue: 'trace', value: tracePageSize * tracePageCount }
      ]
      return labelValues
    }
  })

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
      ctx.logger({ log: `Starting worker with id "${workerId}", queue id "${queueId}"...` })
      return {
        workerThreadOpts: {
          workerData: {
            id: workerId,
            queueId,
            DB_URL,
            TRACE_DB_URL,
            TASK_QUEUE_MAX_RETRIES: ctx.TASK_QUEUE_MAX_RETRIES,
            TASK_QUEUE_RETRY_DELAY: ctx.TASK_QUEUE_RETRY_DELAY
          }
        }
      }
    }
  })

  const broadcastChannel = new BroadcastChannel('mu-worker')
  const broadcastLogger = logger.child('workerQueueBroadcast')

  broadcastChannel.onmessage = (event) => handleWorkerMetricsMessage({
    retriesGauge: taskRetriesGauge,
    stageGauge: errorStageGauge,
    maximumQueueArray,
    maximumQueueTimeArray,
    logger: broadcastLogger
  })({ payload: event.data })

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
    isWallet: gatewayClient.isWalletWith({ fetch, histogram, ARWEAVE_URL, logger: sendDataItemLogger }),
    logger: sendDataItemLogger,
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: sendDataItemLogger, fetch, histogram }),
    spawnPushEnabled: SPAWN_PUSH_ENABLED,
    db,
    GET_RESULT_MAX_RETRIES: ctx.GET_RESULT_MAX_RETRIES,
    GET_RESULT_RETRY_DELAY: ctx.GET_RESULT_RETRY_DELAY
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

  /**
   * Create cron to clear out traces, each hour
   */
  workerPool.exec('startDeleteTraceCron')

  const monitorProcessLogger = logger.child('monitorProcess')
  const fetchCron = fromPromise(fetchCronSchema.implement(cuClient.fetchCronWith({ fetch, histogram, CU_URL, logger: monitorProcessLogger })))

  const saveCronProcess = saveCronProcessWith({ db })
  const deleteCronProcess = deleteCronProcessWith({ db })
  const updateCronProcessCursor = updateCronProcessCursorWith({ db })
  const getCronProcessCursor = getCronProcessCursorWith({ db })

  async function getCronProcesses () {
    function createQuery () {
      return {
        sql: `
          SELECT * FROM ${SqliteClient.CRON_PROCESSES_TABLE}
          WHERE status = 'running'
        `,
        parameters: []
      }
    }
    const processes = (await db.query(createQuery()))
    return processes
  }
  /**
   * Initialize cron monitor to include existing crons in sqlite cron processes table.
   */
  const existingCrons = Object.keys(await getCronProcesses()).length || 0
  cronMonitorGauge.set(existingCrons)

  const startProcessMonitor = cronClient.startMonitoredProcessWith({
    fetch,
    cron,
    histogram,
    logger: monitorProcessLogger,
    PROC_FILE_PATH,
    CRON_CURSOR_DIR,
    CU_URL,
    fetchCron,
    crank,
    monitorGauge: cronMonitorGauge,
    saveCronProcess,
    updateCronProcessCursor,
    getCronProcessCursor
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
      monitorGauge: cronMonitorGauge,
      deleteCronProcess
    }),
    createDataItem,
    logger: monitorProcessLogger
  })

  const traceMsgs = fromPromise(readTracesWith({ db: traceDb, TRACE_DB_URL: ctx.TRACE_DB_URL, DISABLE_TRACE: ctx.DISABLE_TRACE }))

  const pushMsgItemLogger = logger.child('pushMsg')
  const pushMsg = pushMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendDataItemLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: sendDataItemLogger }),
    crank,
    logger: pushMsgItemLogger,
    fetchTransactions: gatewayClient.fetchTransactionDetailsWith({ fetch, GRAPHQL_URL }),
    ALLOW_PUSHES_AFTER
  })

  const startMessageRecoveryCronLogger = logger.child('messageRecoveryCron')
  const startMessageRecoveryCron = startMessageRecoveryCronWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: startMessageRecoveryCronLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: startMessageRecoveryCronLogger }),
    logger: startMessageRecoveryCronLogger,
    db,
    cron,
    crank,
    GET_RESULT_MAX_RETRIES: ctx.GET_RESULT_MAX_RETRIES,
    GET_RESULT_RETRY_DELAY: ctx.GET_RESULT_RETRY_DELAY,
    MESSAGE_RECOVERY_MAX_RETRIES: ctx.MESSAGE_RECOVERY_MAX_RETRIES,
    MESSAGE_RECOVERY_RETRY_DELAY: ctx.MESSAGE_RECOVERY_RETRY_DELAY
  })

  return {
    metrics,
    sendDataItem,
    monitorProcess,
    stopMonitorProcess,
    sendAssign,
    fetchCron,
    pushMsg,
    traceMsgs,
    initCronProcs: cronClient.initCronProcsWith({
      startMonitoredProcess: startProcessMonitor,
      getCronProcesses
    }),
    startMessageRecoveryCron
  }
}

/**
 * A separate set of apis used by the worker
 * to process results. These are separate because
 * we don't want the worker to initialize the same
 * apis that create another worker pool.
 */
export const createResultApis = async (ctx) => {
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET
  const UPLOADER_URL = ctx.UPLOADER_URL
  const GRAPHQL_URL = ctx.GRAPHQL_URL
  const ARWEAVE_URL = ctx.ARWEAVE_URL
  const SPAWN_PUSH_ENABLED = ctx.SPAWN_PUSH_ENABLED
  const RELAY_MAP = ctx.RELAY_MAP

  const logger = ctx.logger
  const fetch = ctx.fetch

  const walletAddress = await arweave.wallets.getAddress(MU_WALLET)

  const fetchWithCache = cuFetchWithCache({
    fetch,
    cache: muRedirectCache,
    logger
  })

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL, followRedirects: true })
  const { locate: locateNoRedirect } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL, followRedirects: false })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  const isWalletCache = InMemoryClient.createLruCache({ size: 1000, ttl: SIXTY_MINUTES_IN_MS })
  const getById = InMemoryClient.getByIdWith({ cache: isWalletCache })
  const setById = InMemoryClient.setByIdWith({ cache: isWalletCache })

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    logger: processMsgLogger,
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
    createDataItem,
    locateScheduler: raw,
    locateProcess: locate,
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, histogram, logger: processMsgLogger }),
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, histogram, logger: processMsgLogger }),
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: processMsgLogger }),
    isWallet: gatewayClient.isWalletWith({ fetch, histogram, ARWEAVE_URL, logger: processMsgLogger, setById, getById }),
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: processMsgLogger, fetch, histogram }),
    RELAY_MAP,
    topUp: RelayClient.topUpWith({ 
      fetch, 
      logger: processMsgLogger, 
      wallet: MU_WALLET, 
      address: walletAddress, 
      fetchTransactions: gatewayClient.fetchTransactionDetailsWith({ fetch, GRAPHQL_URL }) 
    }),
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    locateScheduler: raw,
    locateProcess: locate,
    locateNoRedirect,
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, histogram, logger: processSpawnLogger }),
    fetchResult: cuClient.resultWith({ fetch: fetchWithCache, histogram, CU_URL, logger: processMsgLogger }),
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, histogram, logger: processMsgLogger }),
    spawnPushEnabled: SPAWN_PUSH_ENABLED
  })

  const processAssignLogger = logger.child('processAssign')
  const processAssign = processAssignWith({
    logger: processAssignLogger,
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
