import { z } from 'zod'
import warpArBundles from 'warp-arbundles'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import dbInstance, { createDbClient } from './clients/dbInstance.js'
import cuClient from './clients/cu.js'
import schedulerClient from './clients/scheduler.js'
import signerClient from './clients/signer.js'
import uploaderClient from './clients/uploader.js'
import osClient from './clients/os.js'
import * as InMemoryClient from './clients/in-memory.js'

import dataStoreClient from './lib/datastore.js'
import { processMsgWith, crankMsgsWith, processSpawnWith, monitorProcessWith, stopMonitorProcessWith, sendDataItemWith, traceMsgsWith } from './lib/main.js'

import { createLogger } from './logger.js'

export { errFrom } from './utils.js'

const { DataItem } = warpArBundles

export { dataStoreClient }
export { dbInstance }

const createDataItem = (raw) => new DataItem(raw)
export { createLogger }

export const domainConfigSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  MU_DATABASE_URL: z.string(),
  SCHEDULED_INTERVAL: z.number(),
  DUMP_PATH: z.string(),
  GATEWAY_URL: z.string(),
  UPLOADER_URL: z.string()
})

export const createApis = (ctx) => {
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET
  const MU_DATABASE_URL = ctx.MU_DATABASE_URL
  const UPLOADER_URL = ctx.UPLOADER_URL

  const logger = ctx.logger
  const fetch = ctx.fetch

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 500, GATEWAY_URL: ctx.GATEWAY_URL, followRedirects: true })

  /**
   * hate side effects like this, see TODO in ./dbInstance.js
   */
  createDbClient({ MU_DATABASE_URL })

  const cache = InMemoryClient.createLruCache({ size: 500 })
  const getByProcess = InMemoryClient.getByProcessWith({ cache })
  const setByProcess = InMemoryClient.setByProcessWith({ cache })

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
    saveMsg: dataStoreClient.saveMsgWith({ dbInstance, logger: processMsgLogger }),
    saveSpawn: dataStoreClient.saveSpawnWith({ dbInstance, logger: processMsgLogger }),
    findLatestMsgs: dataStoreClient.findLatestMsgsWith({ dbInstance, logger: processMsgLogger }),
    deleteMsg: dataStoreClient.deleteMsgWith({ dbInstance, logger: processMsgLogger }),
    findLatestSpawns: dataStoreClient.findLatestSpawnsWith({ dbInstance }),
    logger,
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: processMsgLogger, fetch })
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    locateScheduler: raw,
    locateProcess: locate,
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: processSpawnLogger }),
    deleteSpawn: dataStoreClient.deleteSpawnWith({ dbInstance, logger: processSpawnLogger })
  })

  const crankMsgsLogger = logger.child('crankMsgs')
  const crankMsgs = crankMsgsWith({
    processMsg,
    processSpawn,
    saveMessageTrace: dataStoreClient.saveMessageTraceWith({ dbInstance, logger: crankMsgsLogger }),
    logger: crankMsgsLogger
  })

  const sendDataItemLogger = logger.child('sendDataItem')
  const sendDataItem = sendDataItemWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendDataItemLogger }),
    createDataItem,
    locateScheduler: raw,
    locateProcess: locate,
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: sendDataItemLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: sendDataItemLogger }),
    saveMsg: dataStoreClient.saveMsgWith({ dbInstance, logger: sendDataItemLogger }),
    saveSpawn: dataStoreClient.saveSpawnWith({ dbInstance, logger: sendDataItemLogger }),
    findLatestMsgs: dataStoreClient.findLatestMsgsWith({ dbInstance, logger: sendDataItemLogger }),
    findLatestSpawns: dataStoreClient.findLatestSpawnsWith({ dbInstance, logger: sendDataItemLogger }),
    crank: crankMsgs,
    logger: sendDataItemLogger,
    saveMessageTrace: dataStoreClient.saveMessageTraceWith({ dbInstance, logger: sendDataItemLogger })
  })

  const monitorProcessLogger = logger.child('monitorProcess')
  const monitorProcess = monitorProcessWith({
    startProcessMonitor: osClient.startMonitoredProcessWith({ logger: monitorProcessLogger }),
    createDataItem,
    logger: monitorProcessLogger
  })

  const stopMonitorProcessLogger = logger.child('stopMonitorProcess')
  const stopMonitorProcess = stopMonitorProcessWith({
    stopProcessMonitor: osClient.killMonitoredProcessWith({ logger: stopMonitorProcessLogger }),
    createDataItem,
    logger: monitorProcessLogger
  })

  const traceMessagesLogger = logger.child('traceMessages')
  const traceMsgs = traceMsgsWith({
    logger,
    findMessageTraces: dataStoreClient.findMessageTracesWith({ dbInstance, logger: traceMessagesLogger })
  })

  return { sendDataItem, crankMsgs, monitorProcess, stopMonitorProcess, traceMsgs }
}
