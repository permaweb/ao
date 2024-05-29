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
import cronClient from './clients/cron.js'

import { processMsgWith } from './api/processMsg.js'
import { processSpawnWith } from './api/processSpawn.js'
import { monitorProcessWith } from './api/monitorProcess.js'
import { stopMonitorProcessWith } from './api/stopMonitorProcess.js'
import { sendDataItemWith } from './api/sendDataItem.js'
import { sendAssignWith } from './api/sendAssign.js'
import { processAssignWith } from './api/processAssign.js'

import { createLogger } from './logger.js'

export { errFrom } from './utils.js'

const { DataItem } = warpArBundles

const createDataItem = (raw) => new DataItem(raw)
export { createLogger }

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

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL: ctx.GRAPHQL_URL, followRedirects: true })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  const workerPool = workerpool.pool('./src/domain/clients/worker.js', {
    maxWorkers: ctx.MAX_WORKERS,
    onCreateWorker: () => {
      const workerId = randomBytes(8).toString('hex')
      ctx.logger('Starting worker with id "%s"...', workerId)

      return {
        workerThreadOpts: {
          workerData: {
            id: workerId,
            queueId: 1
          }
        }
      }
    }
  })

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
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: sendDataItemLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: sendDataItemLogger }),
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, logger: sendDataItemLogger }),
    crank,
    isWallet: gatewayClient.isWalletWith({ fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger: sendDataItemLogger }),
    logger: sendDataItemLogger,
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: sendDataItemLogger, fetch })
  })

  const sendAssignLogger = logger.child('sendAssign')
  const sendAssign = sendAssignWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendDataItemLogger }),
    locateProcess: locate,
    writeAssignment: schedulerClient.writeAssignmentWith({ fetch, logger: sendAssignLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: sendDataItemLogger }),
    crank,
    logger: sendAssignLogger
  })

  const monitorProcessLogger = logger.child('monitorProcess')
  const fetchCron = fromPromise(cuClient.fetchCronWith({ CU_URL, logger: monitorProcessLogger }))
  const startProcessMonitor = cronClient.startMonitoredProcessWith({
    logger: monitorProcessLogger,
    PROC_FILE_PATH,
    CRON_CURSOR_DIR,
    CU_URL,
    fetchCron,
    crank
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
      PROC_FILE_PATH
    }),
    createDataItem,
    logger: monitorProcessLogger
  })

  return {
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

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL: ctx.GRAPHQL_URL, followRedirects: true })
  const { locate: locateNoRedirect } = schedulerUtilsConnect({ cacheSize: 500, GRAPHQL_URL: ctx.GRAPHQL_URL, followRedirects: false })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

  const isWalletCache = InMemoryClient.createLruCache({ size: 1000 })
  const getById = InMemoryClient.getByIdWith({ cache: isWalletCache })
  const setById = InMemoryClient.setByIdWith({ cache: isWalletCache })

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
    createDataItem,
    locateScheduler: raw,
    locateProcess: locate,
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: processMsgLogger }),
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, logger: processMsgLogger }),
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: processMsgLogger }),
    logger,
    isWallet: gatewayClient.isWalletWith({ fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger: processMsgLogger, setById, getById }),
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: processMsgLogger, fetch })
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    locateScheduler: raw,
    locateProcess: locate,
    locateNoRedirect,
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: processSpawnLogger })
  })

  const processAssignLogger = logger.child('processAssign')
  const processAssign = processAssignWith({
    logger: processSpawnLogger,
    locateProcess: locate,
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: processAssignLogger }),
    writeAssignment: schedulerClient.writeAssignmentWith({ fetch, logger: processAssignLogger })
  })
  return {
    processMsg,
    processAssign,
    processSpawn
  }
}
