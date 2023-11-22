import { z } from 'zod'
import warpArBundles from 'warp-arbundles'

import dataStoreClient from './clients/datastore.js'
import dbInstance, { createDbClient } from './clients/dbInstance.js'
import cuClient from './clients/cu.js'
import sequencerClient from './clients/sequencer.js'
import signerClient from './clients/signer.js'

import { processMsgWith, crankMsgsWith, processSpawnWith, monitorProcessWith, sendMsgWith } from './lib/main.js'

import runScheduledWith from './bg/manager.js'

import { createLogger } from './logger.js'

export { errFrom } from './utils.js'

const { DataItem } = warpArBundles

export { dataStoreClient }
export { dbInstance }

const createDataItem = (raw) => new DataItem(raw)
export { createLogger }

export const createScheduledApis = (ctx) => {
  const MU_DATABASE_URL = ctx.MU_DATABASE_URL

  /**
   * hate side effects like this, see TODO in ./dbInstance.js
   */
  createDbClient({ MU_DATABASE_URL })

  const batchLogger = createLogger('ao-mu-batch')
  const runScheduledLogger = batchLogger.child('runScheduled')
  const runScheduled = runScheduledWith({ dbClient: dataStoreClient, dbInstance, logger: runScheduledLogger })
  return { runScheduled }
}

export const domainConfigSchema = z.object({
  SEQUENCER_URL: z.string().url('SEQUENCER_URL must be a a valid URL'),
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  MU_DATABASE_URL: z.string()
})

export const createApis = (ctx) => {
  const SEQUENCER_URL = ctx.SEQUENCER_URL
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET
  const MU_DATABASE_URL = ctx.MU_DATABASE_URL

  const logger = ctx.logger
  const fetch = ctx.fetch

  /**
   * hate side effects like this, see TODO in ./dbInstance.js
   */
  createDbClient({ MU_DATABASE_URL })

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
    createDataItem,
    writeSequencerTx: sequencerClient.writeMessageWith({ fetch, SEQUENCER_URL, logger: processMsgLogger }),
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: processMsgLogger }),
    saveMsg: dataStoreClient.saveMsgWith({ dbInstance, logger: processMsgLogger }),
    saveSpawn: dataStoreClient.saveSpawnWith({ dbInstance, logger: processMsgLogger }),
    findLatestMsgs: dataStoreClient.findLatestMsgsWith({ dbInstance, logger: processMsgLogger }),
    deleteMsg: dataStoreClient.deleteMsgWith({ dbInstance, logger: processMsgLogger }),
    findLatestSpawns: dataStoreClient.findLatestSpawnsWith({ dbInstance }),
    logger
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    writeProcessTx: sequencerClient.writeProcessTxWith({ SEQUENCER_URL, MU_WALLET, logger: processSpawnLogger }),
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    writeSequencerTx: sequencerClient.writeMessageWith({ fetch, SEQUENCER_URL, logger: processSpawnLogger }),
    deleteSpawn: dataStoreClient.deleteSpawnWith({ dbInstance, logger: processSpawnLogger })
  })

  const sendMsgLogger = logger.child('sendMsg')
  const sendMsg = sendMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: sendMsgLogger }),
    createDataItem,
    writeSequencerTx: sequencerClient.writeMessageWith({ fetch, SEQUENCER_URL, logger: sendMsgLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: sendMsgLogger }),
    saveMsg: dataStoreClient.saveMsgWith({ dbInstance, logger: sendMsgLogger }),
    saveSpawn: dataStoreClient.saveSpawnWith({ dbInstance, logger: sendMsgLogger }),
    findLatestMsgs: dataStoreClient.findLatestMsgsWith({ dbInstance, logger: sendMsgLogger }),
    findLatestSpawns: dataStoreClient.findLatestSpawnsWith({ dbInstance, logger: sendMsgLogger }),
    processMsg,
    processSpawn,
    logger: sendMsgLogger
  })

  const crankMsgsLogger = logger.child('crankMsgs')
  const crankMsgs = crankMsgsWith({
    processMsg,
    processSpawn,
    logger: crankMsgsLogger
  })

  const monitorProcessLogger = logger.child('monitorProcess')
  const monitorProcess = monitorProcessWith({
    saveProcessToMonitor: dataStoreClient.saveMonitoredProcessWith({ dbInstance, logger: monitorProcessLogger }),
    createDataItem,
    fetchSequencerProcess: sequencerClient.fetchSequencerProcessWith({ logger: monitorProcessLogger, SEQUENCER_URL }),
    logger: monitorProcessLogger
  })

  return { sendMsg, crankMsgs, monitorProcess }
}
