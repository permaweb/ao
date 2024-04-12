import { z } from 'zod'
import warpArBundles from 'warp-arbundles'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import cuClient from './clients/cu.js'
import schedulerClient from './clients/scheduler.js'
import signerClient from './clients/signer.js'
import uploaderClient from './clients/uploader.js'
import osClient from './clients/os.js'
import * as InMemoryClient from './clients/in-memory.js'

import { processMsgWith } from './api/processMsg.js'
import { crankMsgsWith } from './api/crankMsgs.js'
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

export const domainConfigSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  SCHEDULED_INTERVAL: z.number(),
  DUMP_PATH: z.string(),
  GRAPHQL_URL: z.string(),
  UPLOADER_URL: z.string()
})

export const createApis = (ctx) => {
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

  const crankMsgsLogger = logger.child('crankMsgs')
  const crankMsgs = crankMsgsWith({
    processMsg,
    processSpawn,
    processAssign,
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
    fetchSchedulerProcess: schedulerClient.fetchSchedulerProcessWith({ getByProcess, setByProcess, fetch, logger: sendDataItemLogger }),
    crank: crankMsgs,
    logger: sendDataItemLogger
  })

  const sendAssignLogger = logger.child('sendAssign')
  const sendAssign = sendAssignWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendDataItemLogger }),
    locateProcess: locate,
    writeAssignment: schedulerClient.writeAssignmentWith({ fetch, logger: processAssignLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: sendDataItemLogger }),
    crank: crankMsgs,
    logger: sendAssignLogger
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

  return { sendDataItem, crankMsgs, monitorProcess, stopMonitorProcess, sendAssign }
}
