import { z } from 'zod'
import warpArBundles from 'warp-arbundles'

import pouchDbClient from './clients/pouchdb.js'
import cuClient from './clients/cu.js'
import sequencerClient from './clients/sequencer.js'
import gatewayClient from './clients/gateway.js'

import { initMsgsWith, processMsgWith, crankMsgsWith, processSpawnWith, monitorProcessWith } from './lib/main.js'

import runScheduledWith from './lib/monitor/manager.js'

const { DataItem } = warpArBundles

const dbInstance = pouchDbClient.pouchDb('ao-cache')

dbInstance.createIndex({
  index: {
    fields: ['type']
  }
}).then(function () {
  console.log('Index created successfully');
}).catch(function (err) {
  console.error('Error creating index:', err);
});

const createDataItem = (raw) => new DataItem(raw)

import { createLogger } from './logger.js'
export { createLogger }

export const batchLogger = createLogger('ao-mu-batch')
const runScheduledLogger = batchLogger.child('runScheduled')
const runScheduled = runScheduledWith({dbClient: pouchDbClient, dbInstance, logger: runScheduledLogger})
export { runScheduled }

export const domainConfigSchema = z.object({
  SEQUENCER_URL: z.string().url('SEQUENCER_URL must be a a valid URL'),
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any())
})

export const createApis = (ctx) => {
  const SEQUENCER_URL = ctx.SEQUENCER_URL
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET

  const logger = ctx.logger
  const fetch = ctx.fetch

  const initMsgsLogger = logger.child('initMsgs')
  const initMsgs = initMsgsWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: initMsgsLogger }),
    createDataItem,
    cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL, logger: initMsgsLogger }),
    writeSequencerTx: sequencerClient.writeMessageWith({ fetch, SEQUENCER_URL, logger: initMsgsLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: initMsgsLogger }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    logger: initMsgsLogger
  })

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
    createDataItem,
    cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL, logger: processMsgLogger }),
    writeSequencerTx: sequencerClient.writeMessageWith({ fetch, SEQUENCER_URL, logger: processMsgLogger }),
    buildAndSign: sequencerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: processMsgLogger }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    updateMsg: pouchDbClient.updateMsgWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    logger
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    writeContractTx: sequencerClient.writeContractTxWith({ SEQUENCER_URL, MU_WALLET, logger: processSpawnLogger })
  })

  const crankMsgsLogger = logger.child('crankMsgs')
  const crankMsgs = crankMsgsWith({
    processMsg,
    processSpawn,
    logger: crankMsgsLogger
  })

  const monitorProcessLogger = logger.child('monitorProcess')
  const monitorProcess = monitorProcessWith({
    saveProcessToMonitor: pouchDbClient.saveMonitoredProcessWith({pouchDb: dbInstance, logger: monitorProcessLogger}),
    createDataItem,
    fetchGatewayProcess: gatewayClient.fetchGatewayProcessWith({logger: monitorProcessLogger, GATEWAY_URL: "https://arweave.net"}),
    logger: monitorProcessLogger
  })

  return { initMsgs, crankMsgs, monitorProcess }
}